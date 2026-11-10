import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/contact/route.ts";

const originalEnv = {
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  REFI_CONTACT_EMAIL: process.env.REFI_CONTACT_EMAIL,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
};
const originalFetch = globalThis.fetch;
let ipSequence = 0;

function request(body, options = {}) {
  ipSequence += 1;
  return new Request("https://refi.test/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `198.51.100.${ipSequence}`,
      ...(options.headers || {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validPayload(overrides = {}) {
  return {
    name: "Test Person",
    email: "person@example.com",
    topic: "General enquiry",
    message: "I would like to learn more about your programmes.",
    ...overrides,
  };
}

async function json(response) {
  return response.json();
}

beforeEach(() => {
  process.env.BREVO_API_KEY = "test-key";
  process.env.REFI_CONTACT_EMAIL = "contact@example.org";
  process.env.BREVO_SENDER_EMAIL = "website@example.org";
  process.env.BREVO_SENDER_NAME = "REFI Foundation";
  globalThis.fetch = async () => new Response(null, { status: 201 });
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = originalFetch;
});

test("rejects malformed JSON", async () => {
  const response = await POST(request("{"));
  assert.equal(response.status, 400);
});

test("rejects invalid fields and unknown topics", async () => {
  const response = await POST(request(validPayload({ email: "not-an-email", topic: "Other" })));
  assert.equal(response.status, 400);
});

test("rejects oversized streamed request bodies", async () => {
  const response = await POST(request("x".repeat(12_001)));
  assert.equal(response.status, 413);
});

test("honeypot submissions return a neutral success without sending email", async () => {
  let sends = 0;
  globalThis.fetch = async () => { sends += 1; return new Response(null, { status: 201 }); };
  const response = await POST(request(validPayload({ website: "spam" })));
  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), { ok: true });
  assert.equal(sends, 0);
});

test("returns a clear configuration error when Brevo is not configured", async () => {
  delete process.env.BREVO_API_KEY;
  const response = await POST(request(validPayload()));
  assert.equal(response.status, 503);
});

test("sends a validated enquiry to Brevo and returns success", async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://api.brevo.com/v3/smtp/email");
    sent = JSON.parse(init.body);
    return new Response(null, { status: 201 });
  };
  const response = await POST(request(validPayload()));
  assert.equal(response.status, 200);
  assert.deepEqual(await json(response), { ok: true });
  assert.equal(sent.to[0].email, "contact@example.org");
  assert.equal(sent.replyTo.email, "person@example.com");
  assert.match(sent.textContent, /I would like to learn more/);
});

test("does not report success when Brevo rejects the enquiry", async () => {
  globalThis.fetch = async () => new Response("provider error", { status: 500 });
  const response = await POST(request(validPayload()));
  assert.equal(response.status, 502);
});

test("limits repeated submissions from one IP within the window", async () => {
  const ip = "203.0.113.77";
  let response;
  for (let i = 0; i < 6; i += 1) {
    response = await POST(request(validPayload(), { headers: { "x-forwarded-for": ip } }));
  }
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "900");
});
