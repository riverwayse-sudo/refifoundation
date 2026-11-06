#!/usr/bin/env node
/**
 * Restores all CMS rows from content/cms-backup.json.
 *
 * This is a non-destructive upsert: records in the backup are restored, but rows
 * created after the backup are not deleted. Confirm the target project carefully.
 * The backup may contain unpublished editorial material.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:restore
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const file = path.join(process.cwd(), "content", "cms-backup.json");
const backup = JSON.parse(await readFile(file, "utf8"));
const allowed = ["home", "stories", "projects", "events", "impact_metrics", "pages"];

if (backup?.version !== 1 || !backup.collections || typeof backup.collections !== "object") {
  throw new Error("Unsupported or invalid CMS backup format.");
}

const rows = [];
for (const collection of allowed) {
  const collectionRows = backup.collections[collection];
  if (!Array.isArray(collectionRows)) throw new Error(`Backup is missing collection: ${collection}`);
  for (const row of collectionRows) {
    if (
      !row ||
      row.collection !== collection ||
      typeof row.slug !== "string" ||
      !row.slug ||
      !row.data ||
      typeof row.data !== "object" ||
      Array.isArray(row.data) ||
      typeof row.published !== "boolean" ||
      (row.published_at !== null && typeof row.published_at !== "string")
    ) {
      throw new Error(`Invalid backup row in collection: ${collection}`);
    }
    rows.push({
      collection,
      slug: row.slug,
      data: row.data,
      published: row.published,
      published_at: row.published_at,
      updated_by: null,
    });
  }
}

for (let offset = 0; offset < rows.length; offset += 50) {
  const response = await fetch(`${url}/rest/v1/content?on_conflict=collection,slug`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows.slice(offset, offset + 50)),
  });
  if (!response.ok) {
    throw new Error(`Restore failed (${response.status}): ${await response.text()}`);
  }
}

console.log(`Restored ${rows.length} CMS rows from ${backup.generatedAt ?? "the saved backup"}.`);
console.log("This was an upsert only; rows absent from the backup were not deleted.");
