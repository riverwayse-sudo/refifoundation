#!/usr/bin/env node
/**
 * One-time, repeatable import from the repository's JSON content into the REFI
 * Supabase CMS. Run after applying the CMS schema migration and configuring the
 * Supabase environment variables.
 *
 * Usage: npm run cms:import
 *
 * The script upserts by (collection, slug); it never deletes rows. Review the
 * database and run a snapshot before importing into an already-used CMS.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const root = process.cwd();
function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function dateOrNull(value, source) {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) throw new Error(`Invalid publish date in ${source}: ${value}`);
  return new Date(timestamp).toISOString();
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, "content", file), "utf8"));
}

const sources = [
  { collection: "stories", file: "stories.json", key: "stories" },
  { collection: "projects", file: "projects.json", key: "projects" },
  { collection: "events", file: "events.json", key: "events" },
  { collection: "impact_metrics", file: "impact-metrics.json", key: "metrics" },
  { collection: "pages", file: "pages.json", key: "pages" },
];

function rowFor(collection, item, index) {
  const slug = collection === "home"
    ? "home"
    : (slugify(item.slug) || slugify(item.title || item.label) || `${collection}-${index + 1}`);
  const data = { ...item, slug };
  const explicitlyUnpublished = item.published === false;
  let published = false;
  let publishedAt = null;

  if (collection === "home" || collection === "projects") published = !explicitlyUnpublished;
  if (collection === "stories") {
    publishedAt = dateOrNull(item.publishedAt, `${collection}/${slug}`);
    published = !explicitlyUnpublished && Boolean(publishedAt);
  }
  if (collection === "pages") {
    published = item.published === true;
    publishedAt = dateOrNull(item.publishedAt, `${collection}/${slug}`);
  }
  if (collection === "events") published = !explicitlyUnpublished && item.status === "Published";
  if (collection === "impact_metrics") published = !explicitlyUnpublished && item.verified === true;

  return {
    collection,
    slug,
    data,
    published,
    published_at: publishedAt,
  };
}

async function upsert(rows) {
  if (rows.length === 0) return;
  const response = await fetch(
    `${url}/rest/v1/content?on_conflict=collection,slug`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase import failed (${response.status}): ${await response.text()}`);
  }
}

const home = await readJson("home.json");
const allRows = [rowFor("home", home, 0)];

for (const source of sources) {
  const document = await readJson(source.file);
  const items = Array.isArray(document[source.key]) ? document[source.key] : [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Invalid record in content/${source.file} at index ${index}`);
    }
    allRows.push(rowFor(source.collection, item, index));
  }
}

for (let offset = 0; offset < allRows.length; offset += 50) {
  await upsert(allRows.slice(offset, offset + 50));
}

console.log(`Imported/upserted ${allRows.length} records across ${sources.length + 1} collections.`);
console.log("No rows were deleted. Review the CMS dashboard and public site before removing the old CMS.");
