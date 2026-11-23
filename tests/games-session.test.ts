import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installTsHooks } from "./support/resolve-ts.mjs";

installTsHooks();

const {
  issueSession,
  sessionDurationMs,
  SESSION_TTL_MS,
  sessionsConfigured,
  sessionSecret,
  verifySessionToken,
} = await import("../src/lib/games/session.ts");

const SECRET = "a".repeat(48);
const original = process.env.SCORE_SESSION_SECRET;

afterEach(() => {
  if (original === undefined) delete process.env.SCORE_SESSION_SECRET;
  else process.env.SCORE_SESSION_SECRET = original;
});

function configure(secret: string | undefined) {
  if (secret === undefined) delete process.env.SCORE_SESSION_SECRET;
  else process.env.SCORE_SESSION_SECRET = secret;
}

test("no secret means no session is issued", () => {
  configure(undefined);
  assert.equal(sessionsConfigured(), false);
  assert.equal(issueSession("memory-match"), null);
});

test("a short secret is refused rather than used", () => {
  configure("too-short");
  assert.equal(sessionSecret(), null);
  assert.equal(issueSession("stack-it"), null);
});

test("an issued session verifies for its own game", () => {
  configure(SECRET);
  const now = 1_800_000_000_000;
  const session = issueSession("stack-it", now);
  assert.ok(session);
  const checked = verifySessionToken(session.token, "stack-it", now + 30_000);
  assert.equal(checked.ok, true);
  assert.equal(checked.ok && checked.sessionId, session.sessionId);
});

test("a session cannot be spent on another game", () => {
  configure(SECRET);
  const session = issueSession("stack-it");
  assert.ok(session);
  assert.equal(verifySessionToken(session.token, "memory-match").ok, false);
});

test("a tampered payload fails the signature check", () => {
  configure(SECRET);
  const session = issueSession("stack-it");
  assert.ok(session);
  const [, signature] = session.token.split(".");
  const forged = Buffer.from(JSON.stringify({
    v: 1,
    sid: "00000000-0000-4000-8000-000000000000",
    game: "stack-it",
    iat: Date.now() - 1_000,
  }), "utf8").toString("base64url");
  assert.equal(verifySessionToken(`${forged}.${signature}`, "stack-it").ok, false);
});

test("a malformed token is refused", () => {
  configure(SECRET);
  const bad: unknown[] = ["", "nothing", "a.b.c", `${"x".repeat(20)}.`, 42, null];
  for (const token of bad) {
    assert.equal(verifySessionToken(token, "stack-it").ok, false);
  }
});

test("an expired session is refused", () => {
  configure(SECRET);
  const issued = 1_800_000_000_000;
  const session = issueSession("stack-it", issued);
  assert.ok(session);
  assert.equal(verifySessionToken(session.token, "stack-it", issued + SESSION_TTL_MS + 1).ok, false);
});

test("a session that starts far in the future is refused", () => {
  configure(SECRET);
  const now = 1_800_000_000_000;
  const session = issueSession("stack-it", now + 10 * 60_000);
  assert.ok(session);
  assert.equal(verifySessionToken(session.token, "stack-it", now).ok, false);
});

test("the server measures the round duration, not the client", () => {
  const issued = 1_800_000_000_000;
  assert.equal(sessionDurationMs(issued, issued + 42_500), 42_500);
  assert.equal(sessionDurationMs(issued, issued - 5_000), 0);
});

test("verification fails closed when the secret is removed", () => {
  configure(SECRET);
  const session = issueSession("stack-it");
  assert.ok(session);
  configure(undefined);
  assert.equal(verifySessionToken(session.token, "stack-it").ok, false);
});
