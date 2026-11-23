#!/usr/bin/env node
// Verifies the live-score feed's free-tier safeguards against a real build.
//
// A local mock provider stands in for API-Football so the real daily quota is
// never touched. The script drives the actual production server and the actual
// route, and asserts the behaviour that protects the free tier:
//   - cache hits do not consume provider requests
//   - concurrent cache misses collapse into one upstream call
//   - the daily budget stops upstream calls once reached
//   - provider errors, quota responses and a missing key degrade honestly
//   - no result is ever fabricated, and the key never reaches the client

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createProbe } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import { rmSync } from "node:fs";

const API_KEY = "test-key-do-not-log";
const CANONICAL_LIMIT = 100;

let hits = 0;
let mode = "ok";
let delayMs = 0;

const FIXTURES = [
  { fixture: { id: 1001, date: "2026-10-25T15:00:00+00:00", status: { short: "2H", long: "Second Half", elapsed: 63 } },
    league: { id: 39, name: "Premier League", country: "England", type: "League" },
    teams: { home: { id: 1, name: "Arsenal", logo: null }, away: { id: 2, name: "Chelsea", logo: null } },
    goals: { home: 2, away: 1 } },
  { fixture: { id: 1002, date: "2026-10-25T16:00:00+00:00", status: { short: "NS", long: "Not Started", elapsed: null } },
    league: { id: 999, name: "Nigeria Premier Football League", country: "Nigeria", type: "League" },
    teams: { home: { id: 5, name: "Enyimba", logo: null }, away: { id: 6, name: "Kano Pillars", logo: null } },
    goals: { home: null, away: null } },
  { fixture: { id: 1004, date: "2026-10-25T16:00:00+00:00", status: { short: "2H", long: "Second Half", elapsed: 50 } },
    league: { id: 848, name: "Serie A", country: "Italy", type: "League" },
    teams: { home: { id: 7, name: "Inter", logo: null }, away: { id: 8, name: "Roma", logo: null } },
    goals: { home: 0, away: 0 } },
];

function startMockProvider() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      hits += 1;
      if (delayMs) await sleep(delayMs);
      if (mode === "error500") { res.writeHead(500, { "content-type": "application/json" }); res.end("{}"); return; }
      if (mode === "quota") {
        res.writeHead(429, { "content-type": "application/json", "x-ratelimit-requests-limit": String(CANONICAL_LIMIT) });
        res.end("{}"); return;
      }
      const body = mode === "apierror" ? { errors: { rateLimit: "reached" }, response: [] }
        : mode === "empty" ? { errors: [], response: [] }
        : { errors: [], response: FIXTURES };
      res.writeHead(200, {
        "content-type": "application/json",
        "x-ratelimit-requests-limit": String(CANONICAL_LIMIT),
        "x-ratelimit-requests-current": String(hits),
      });
      res.end(JSON.stringify(body));
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createProbe();
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
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function startSite(env) {
  // Next.js persists the fetch cache to disk, so a restart would otherwise
  // serve a previous phase's response instead of calling the mock provider.
  // Clearing it keeps each phase's upstream-call counts meaningful.
  rmSync(".next/cache", { recursive: true, force: true });
  const port = await freePort();
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    env: { ...process.env, ...env },
    stdio: "ignore",
  });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${origin}/matches`);
      if (res.ok) return { child, origin };
    } catch {
      // not up yet
    }
    await sleep(400);
  }
  child.kill("SIGKILL");
  throw new Error("site did not become ready");
}

function stopSite(child) {
  return new Promise((resolve) => {
    child.on("exit", resolve);
    child.kill("SIGTERM");
    setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000);
  });
}

const results = [];
function check(name, condition, detail = "") {
  results.push({ name, pass: Boolean(condition), detail });
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function feed(origin) {
  const res = await fetch(`${origin}/api/matches/live`);
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), raw: text };
}

async function main() {
  console.log("building…");
  await run("npx", ["next", "build"]);

  const { server: mock, port: mockPort } = await startMockProvider();
  const base = `http://127.0.0.1:${mockPort}`;
  console.log(`mock provider on ${base}`);

  // 1. Cache hits must not consume provider requests.
  mode = "ok"; delayMs = 0; hits = 0;
  let site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "120" });
  for (let i = 0; i < 10; i += 1) await feed(site.origin);
  check("cache hits do not spend provider requests", hits === 1, `10 route calls -> ${hits} upstream call(s)`);

  const sample = await feed(site.origin);
  check("in-scope competitions are returned", sample.body.matches.length === 2, `${sample.body.matches.length} matches`);
  check("out-of-scope competition is filtered out", !sample.raw.includes("Serie A"), "Serie A absent");
  check("provider key never reaches the client", !sample.raw.includes(API_KEY), "key not in response");
  check("no fabricated scores", sample.body.matches.every((m) => m.home.name !== "Home team"), "real team names only");
  await stopSite(site.child);

  // 2. Concurrent cache misses must collapse into one upstream call.
  mode = "ok"; delayMs = 500; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "120" });
  await Promise.all(Array.from({ length: 8 }, () => feed(site.origin)));
  check("concurrent requests do not stampede the provider", hits === 1, `8 concurrent -> ${hits} upstream call(s)`);
  await stopSite(site.child);

  // 3. The daily budget must stop upstream calls once reached.
  mode = "ok"; delayMs = 0; hits = 0;
  site = await startSite({
    FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY,
    FOOTBALL_REFRESH_SECONDS: "1", LIVE_SCORE_DAILY_BUDGET: "2",
  });
  const seen = [];
  for (let i = 0; i < 5; i += 1) {
    seen.push(await feed(site.origin));
    await sleep(1300);
  }
  const exhausted = seen.filter((r) => r.body.budgetExhausted === true);
  check("budget guard stops upstream calls", hits === 2, `5 spaced calls -> ${hits} upstream call(s)`);
  check("budget exhaustion is reported honestly", exhausted.length >= 1, `${exhausted.length} exhausted response(s)`);
  check("exhausted feed invents no matches", exhausted.every((r) => r.body.matches.length === 0), "no matches when exhausted");
  await stopSite(site.child);

  // 4. Provider quota response must be treated as exhausted, not retried.
  mode = "quota"; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "1" });
  const quota = await feed(site.origin);
  await sleep(1400);
  const quota2 = await feed(site.origin);
  check("provider 429 is reported as exhausted", quota.body.budgetExhausted === true, "budgetExhausted true");
  check("no retry storm on quota response", hits <= 2, `${hits} upstream call(s) for 2 calls`);
  check("quota response fabricates no scores", quota.body.matches.length === 0, "no matches");
  void quota2;
  await stopSite(site.child);

  // 5. Provider errors must degrade honestly.
  mode = "error500"; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "120" });
  const err = await feed(site.origin);
  check("provider 500 degrades honestly", err.status === 200 && err.body.matches.length === 0 && Boolean(err.body.message), err.body.message);
  check("provider 500 fabricates no scores", !err.raw.includes("Arsenal"), "no invented fixtures");
  await stopSite(site.child);

  mode = "apierror"; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "120" });
  const apiErr = await feed(site.origin);
  check("provider API error degrades honestly", apiErr.body.matches.length === 0 && Boolean(apiErr.body.message), apiErr.body.message);
  await stopSite(site.child);

  // 6. Genuinely no live matches must not be confused with an error.
  mode = "empty"; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, API_FOOTBALL_KEY: API_KEY, FOOTBALL_REFRESH_SECONDS: "120" });
  const empty = await feed(site.origin);
  check("empty feed is not an error", empty.body.configured === true && empty.body.matches.length === 0 && !empty.body.message, "configured, no message");
  await stopSite(site.child);

  // 7. A missing key must be reported, not worked around.
  mode = "ok"; hits = 0;
  site = await startSite({ FOOTBALL_API_BASE: base, FOOTBALL_REFRESH_SECONDS: "120" });
  const noKey = await feed(site.origin);
  check("missing credentials are reported", noKey.status === 503 && noKey.body.configured === false, `status ${noKey.status}`);
  check("missing credentials make no upstream call", hits === 0, `${hits} upstream call(s)`);
  check("missing credentials fabricate no scores", noKey.body.matches.length === 0, "no matches");
  await stopSite(site.child);

  mock.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("failures:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
