import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { installTsHooks } from "./support/resolve-ts.mjs";

installTsHooks();

type Seen = { method: string; url: string; prefer: string; body: string };
const seen: Seen[] = [];
let reply: { status: number; body: unknown } = { status: 201, body: [] };
let server: Server;
let mod: typeof import("../src/lib/games/leaderboard.ts");

before(async () => {
  server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      seen.push({
        method: request.method ?? "",
        url: request.url ?? "",
        prefer: String(request.headers.prefer ?? ""),
        body,
      });
      response.writeHead(reply.status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  mod = await import("../src/lib/games/leaderboard.ts");
});

after(() => {
  server.close();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test("a stored round is sent to the scores table and reported as stored", async () => {
  seen.length = 0;
  reply = { status: 201, body: [{ id: 1 }] };
  const result = await mod.recordScore({
    sessionId: "11111111-1111-4111-8111-111111111111",
    game: "stack-it",
    score: 12,
    durationMs: 30_000,
    displayName: "Player One",
  });
  assert.deepEqual(result, { stored: true, duplicate: false, persistence: true });
  assert.equal(seen[0].method, "POST");
  assert.match(seen[0].url ?? "", /\/rest\/v1\/game_scores$/);
  assert.match(seen[0].prefer, /resolution=ignore-duplicates/);
  const payload = JSON.parse(seen[0].body);
  assert.equal(payload[0].session_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(payload[0].score, 12);
  assert.equal(payload[0].duration_ms, 30_000);
  assert.equal(payload[0].display_name, "Player One");
});

test("an empty representation is a replay, not a new entry", async () => {
  reply = { status: 201, body: [] };
  const result = await mod.recordScore({
    sessionId: "22222222-2222-4222-8222-222222222222",
    game: "stack-it",
    score: 5,
    durationMs: 12_000,
    displayName: "Player Two",
  });
  assert.deepEqual(result, { stored: false, duplicate: true, persistence: true });
});

test("a unique violation is treated as a duplicate", async () => {
  reply = { status: 409, body: { message: "duplicate key value violates unique constraint" } };
  const result = await mod.recordScore({
    sessionId: "33333333-3333-4333-8333-333333333333",
    game: "memory-match",
    score: 300,
    durationMs: 45_000,
    displayName: "Player Three",
  });
  assert.deepEqual(result, { stored: false, duplicate: true, persistence: true });
});

test("a missing table is reported as a setup gap, not as a stored round", async () => {
  reply = { status: 404, body: { message: "relation does not exist" } };
  const result = await mod.recordScore({
    sessionId: "44444444-4444-4444-8444-444444444444",
    game: "reflex-rush",
    score: 8,
    durationMs: 20_000,
    displayName: "Player Four",
  });
  assert.equal(result.stored, false);
  assert.equal(result.duplicate, false);
  assert.equal(result.persistence, true);
  assert.match(result.error ?? "", /game_scores/);
});

test("a provider failure is reported as an error, never as stored", async () => {
  reply = { status: 500, body: { message: "boom" } };
  const result = await mod.recordScore({
    sessionId: "55555555-5555-4555-8555-555555555555",
    game: "charity-penalty",
    score: 4,
    durationMs: 60_000,
    displayName: "Player Five",
  });
  assert.equal(result.stored, false);
  assert.equal(result.duplicate, false);
  assert.match(result.error ?? "", /rejected the round/);
});

test("the leaderboard asks for the best score per game with a bounded page", async () => {
  seen.length = 0;
  reply = {
    status: 200,
    body: [
      { display_name: "Ada", score: 12, duration_ms: 20_000, created_at: "2026-11-20T10:00:00Z" },
      { display_name: "Bola", score: 9, duration_ms: 25_000, created_at: "2026-11-21T10:00:00Z" },
    ],
  };
  const board = await mod.getTopScores("stack-it");
  assert.equal(board.available, true);
  assert.equal(board.available && board.rows.length, 2);
  assert.equal(board.available && board.rows[0].displayName, "Ada");
  const url = new URL(seen[0].url, "http://localhost");
  assert.equal(url.searchParams.get("game"), "eq.stack-it");
  assert.equal(url.searchParams.get("order"), "score.desc,created_at.asc");
  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal(url.searchParams.get("select"), "display_name,score,duration_ms,created_at");
});

test("malformed rows are dropped rather than rendered blank", async () => {
  reply = {
    status: 200,
    body: [
      { display_name: "Ada", score: 12, duration_ms: 20_000, created_at: "2026-11-20T10:00:00Z" },
      { display_name: "", score: 4, duration_ms: 20_000, created_at: "2026-11-20T10:00:00Z" },
      { display_name: "NoScore", duration_ms: 20_000, created_at: "2026-11-20T10:00:00Z" },
      { display_name: "NoDate", score: 3, duration_ms: 20_000 },
    ],
  };
  const board = await mod.getTopScores("stack-it");
  assert.equal(board.available && board.rows.length, 1);
});

test("an unreadable store is unavailable, not an empty leaderboard", async () => {
  reply = { status: 503, body: { message: "paused" } };
  const board = await mod.getTopScores("stack-it");
  assert.deepEqual(board, { available: false, reason: "unavailable" });
});
