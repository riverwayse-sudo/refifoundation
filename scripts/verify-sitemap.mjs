#!/usr/bin/env node
// Verifies sitemap.xml against a real production build.
//
// Runs the actual build and the actual route with temporary content, rather
// than reimplementing the filter, so it exercises the same code path the
// deployed site uses. Asserts that a published story is included, that a
// scheduled story is not, and that every URL is the canonical origin.

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

const CONTENT = "content/stories.json";
const CANONICAL = "https://www.refifoundation.com";

const PUBLISHED_SLUG = "ci-sitemap-published";
const SCHEDULED_SLUG = "ci-sitemap-scheduled";

const original = readFileSync(CONTENT, "utf8");
let server;

// Bind to port 0 and read back the assigned port, so the run never collides
// with a leftover server on a fixed port.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

async function fetchSitemapWhenReady(origin, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${origin}/sitemap.xml`);
      if (res.ok) return await res.text();
    } catch {
      // Server not up yet.
    }
    await sleep(500);
  }
  throw new Error(`server did not serve /sitemap.xml within ${timeoutMs}ms`);
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAILED: ${message}`);
  console.log(`  ok: ${message}`);
}

async function main() {
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  writeFileSync(
    CONTENT,
    JSON.stringify(
      {
        stories: [
          { title: "CI published story", slug: PUBLISHED_SLUG, excerpt: "e", category: "News", body: "b", publishedAt: past },
          { title: "CI scheduled story", slug: SCHEDULED_SLUG, excerpt: "e", category: "News", body: "b", publishedAt: future },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  await run("npx", ["next", "build"]);

  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  server = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "ignore",
    detached: true,
  });

  const xml = await fetchSitemapWhenReady(origin);

  assert(xml.includes(`${CANONICAL}/stories/${PUBLISHED_SLUG}`), "published story is in the sitemap");
  assert(!xml.includes(SCHEDULED_SLUG), "scheduled story is excluded from the sitemap");

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert(urls.length > 0, "sitemap contains URLs");
  const offOrigin = urls.filter((u) => !u.startsWith(CANONICAL));
  assert(offOrigin.length === 0, `all URLs use the canonical origin (${offOrigin.length} off-origin)`);
  console.log(`  sitemap URL count: ${urls.length}`);
}

try {
  await main();
  console.log("sitemap verification passed");
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exitCode = 1;
} finally {
  if (server) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  writeFileSync(CONTENT, original);
}
