import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody } from "../src/lib/cms/request-body.ts";

test("reads a valid JSON request within the byte ceiling", async () => {
  const request = new Request("https://refi.test/api/cms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "REFI" }),
  });
  const result = await readJsonBody(request, 128);
  assert.deepEqual(result, { ok: true, value: { title: "REFI" } });
});

test("rejects a body that exceeds the limit by UTF-8 bytes, not characters", async () => {
  const body = JSON.stringify({ value: "é".repeat(80) });
  assert.ok(body.length < 200);
  assert.ok(new TextEncoder().encode(body).byteLength > 200);
  const request = new Request("https://refi.test/api/cms", { method: "POST", body });
  const result = await readJsonBody(request, 200);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("rejects an oversized declared Content-Length before reading", async () => {
  const request = new Request("https://refi.test/api/cms", {
    method: "POST",
    headers: { "content-length": "4096" },
    body: "{}",
  });
  const result = await readJsonBody(request, 32);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("rejects invalid UTF-8 and malformed JSON", async () => {
  const invalidUtf8 = new Request("https://refi.test/api/cms", {
    method: "POST",
    body: new Uint8Array([0xff, 0xfe]),
  });
  const invalidResult = await readJsonBody(invalidUtf8, 32);
  assert.equal(invalidResult.ok, false);
  if (!invalidResult.ok) assert.equal(invalidResult.status, 400);

  const malformed = new Request("https://refi.test/api/cms", {
    method: "POST",
    body: "{",
  });
  const malformedResult = await readJsonBody(malformed, 32);
  assert.equal(malformedResult.ok, false);
  if (!malformedResult.ok) assert.equal(malformedResult.status, 400);
});
