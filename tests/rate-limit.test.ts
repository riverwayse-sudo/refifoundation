import { test } from "node:test";
import assert from "node:assert/strict";
import { clientKey, rateLimit, resetRateLimit } from "../src/lib/cms/rate-limit.ts";

test("rate limiter allows the configured number of attempts and then blocks", () => {
  const key = `test:limit:${Date.now()}:${Math.random()}`;
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  assert.equal(rateLimit(key, 2, 60_000).allowed, true);
  const blocked = rateLimit(key, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  resetRateLimit(key);
});

test("successful authentication can reset the attempt bucket", () => {
  const key = `test:reset:${Date.now()}:${Math.random()}`;
  rateLimit(key, 1, 60_000);
  assert.equal(rateLimit(key, 1, 60_000).allowed, false);
  resetRateLimit(key);
  assert.equal(rateLimit(key, 1, 60_000).allowed, true);
  resetRateLimit(key);
});

test("client identity uses the rightmost proxy address, not a supplied prefix", () => {
  const request = new Request("https://refi.test", {
    headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.77" },
  });
  assert.equal(clientKey(request, "signin"), "signin:203.0.113.77");
});

test("client identity has a safe fallback and bounds untrusted header length", () => {
  const fallback = new Request("https://refi.test");
  assert.equal(clientKey(fallback, "cms"), "cms:unknown");

  const oversized = new Request("https://refi.test", {
    headers: { "x-forwarded-for": "a".repeat(500) },
  });
  assert.equal(clientKey(oversized, "s".repeat(100)).length, 193);
});
