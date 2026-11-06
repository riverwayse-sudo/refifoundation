#!/usr/bin/env node
/**
 * Creates two outputs from the CMS:
 *
 * 1. .cms-backups/cms-backup.json contains ALL editorial rows, including drafts,
 *    for recovery through npm run cms:restore. It is gitignored and must be stored privately.
 * 2. content/*.json contains PUBLISHED rows only and is safe as the public site's
 *    static fallback if Supabase is unavailable.
 *
 * Review the public snapshots before committing. Never commit the full backup;
 * copy it to approved private storage because it may contain unpublished material.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:snapshot
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const TARGETS = [
  { collection: "stories", file: "stories.json", key: "stories" },
  { collection: "projects", file: "projects.json", key: "projects" },
  { collection: "events", file: "events.json", key: "events" },
  { collection: "impact_metrics", file: "impact-metrics.json", key: "metrics" },
  { collection: "pages", file: "pages.json", key: "pages" },
];

const contentDir = path.join(process.cwd(), "content");
const backupDir = path.join(process.cwd(), ".cms-backups");
await mkdir(contentDir, { recursive: true });
await mkdir(backupDir, { recursive: true });

async function fetchCollection(collection) {
  const query = `content?collection=eq.${encodeURIComponent(collection)}&select=*&order=updated_at.asc`;
  const response = await fetch(`${url}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${collection}: ${response.status} ${await response.text()}`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${collection}: unexpected response format`);
  return rows;
}

function toSnapshotRecord(row) {
  return {
    ...row.data,
    slug: row.slug,
    published: row.published === true,
    publishedAt: row.data.publishedAt || row.published_at || undefined,
  };
}

// Fetch everything before writing any file. A failed collection must not leave a
// mixture of old and new snapshots that could be mistaken for a complete backup.
const collections = {};
for (const name of ["home", ...TARGETS.map((target) => target.collection)]) {
  collections[name] = await fetchCollection(name);
}

const backup = {
  version: 1,
  generatedAt: new Date().toISOString(),
  collections,
};
await writeFile(
  path.join(backupDir, "cms-backup.json"),
  JSON.stringify(backup, null, 2) + "\n",
  "utf8",
);
console.log("wrote .cms-backups/cms-backup.json (all editorial rows, including drafts; keep private)");

for (const target of TARGETS) {
  const rows = collections[target.collection];
  // The public fallback must never contain unpublished records. Visibility helpers
  // still handle future dates, event status and metric verification at build time.
  const records = rows.filter((row) => row.published === true).map(toSnapshotRecord);
  const payload = JSON.stringify({ [target.key]: records }, null, 2) + "\n";
  await writeFile(path.join(contentDir, target.file), payload, "utf8");
  console.log(`wrote content/${target.file} (${records.length} published records)`);
}

// Home is a singleton. Never replace the last known-good public homepage with a
// draft or an empty result; the complete current row is already in cms-backup.json.
const home = collections.home.find((row) => row.published === true);
if (home) {
  await writeFile(path.join(contentDir, "home.json"), JSON.stringify(home.data, null, 2) + "\n", "utf8");
  console.log("wrote content/home.json (published homepage)");
} else {
  console.log("no published home row; preserved the existing public homepage snapshot");
}

console.log("\nSnapshot complete. Review and commit the public snapshots only. Keep the private backup outside Git and copy it to approved secure storage.");
