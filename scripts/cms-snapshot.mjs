#!/usr/bin/env node
/**
 * Writes a snapshot of published content into the `content/` directory.
 *
 * Two purposes, both serving the zero-cost constraint:
 *
 *  1. Recovery. Supabase's free tier has no automatic backups, so this is the
 *     safety net: a plain-text copy of all content, in Git, that can be restored
 *     after an accidental deletion. Run it after any significant edit, or on a
 *     schedule.
 *
 *  2. Fallback. The public site reads this snapshot when no backend is configured
 *     or when the backend is unreachable, so a paused project cannot break a build.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:snapshot
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

// Maps a collection to the file and top-level key the loaders expect.
const TARGETS = [
  { collection: "stories", file: "stories.json", key: "stories" },
  { collection: "projects", file: "projects.json", key: "projects" },
  { collection: "events", file: "events.json", key: "events" },
  { collection: "impact_metrics", file: "impact-metrics.json", key: "metrics" },
  { collection: "pages", file: "pages.json", key: "pages" },
];

const contentDir = path.join(process.cwd(), "content");
await mkdir(contentDir, { recursive: true });

async function fetchCollection(collection) {
  const query = `content?collection=eq.${encodeURIComponent(collection)}&select=*&order=updated_at.asc`;
  const response = await fetch(`${url}/rest/v1/${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`${collection}: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

let failures = 0;

for (const target of TARGETS) {
  try {
    const rows = await fetchCollection(target.collection);
    const records = rows
      .filter((row) => row.data && typeof row.data === "object")
      .map((row) => ({
        ...row.data,
        published: row.published,
        publishedAt: row.data.publishedAt ?? row.published_at ?? undefined,
      }));
    const payload = JSON.stringify({ [target.key]: records }, null, 2) + "\n";
    await writeFile(path.join(contentDir, target.file), payload, "utf8");
    console.log(`wrote content/${target.file} (${records.length} records)`);
  } catch (error) {
    failures += 1;
    console.error(`failed to snapshot ${target.collection}: ${error.message}`);
  }
}

// The home page is a singleton and keeps its own shape.
try {
  const rows = await fetchCollection("home");
  if (rows.length > 0) {
    const payload = JSON.stringify(rows[0].data, null, 2) + "\n";
    await writeFile(path.join(contentDir, "home.json"), payload, "utf8");
    console.log("wrote content/home.json");
  } else {
    console.log("no home record found; leaving content/home.json unchanged");
  }
} catch (error) {
  failures += 1;
  console.error(`failed to snapshot home: ${error.message}`);
}

if (failures > 0) {
  console.error(`\n${failures} collection(s) failed. Nothing was deleted; existing files were left in place.`);
  process.exit(1);
}

console.log("\nSnapshot complete. Review and commit the changes under content/.");
