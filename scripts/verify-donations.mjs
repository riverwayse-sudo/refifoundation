#!/usr/bin/env node
// Verifies donation integrity against a real build, with mock services.
//
// A local mock Paystack and a local mock Supabase stand in for the real
// services, so no real payment is created and no real data is touched. The
// script drives the actual production server and the actual routes, and asserts
// the behaviour that protects donors and the Foundation:
//   - a browser redirect cannot mark a donation successful
//   - the server checks amount, currency, reference and status with Paystack
//   - webhook signatures are validated over the raw body
//   - a replayed webhook cannot create a duplicate or inflate totals
//   - pending, failed, mismatched and unverifiable payments are not recorded
//   - a storage failure is never reported as a recorded donation
//   - totals distinguish a known zero from an unknown figure

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createProbe } from "node:net";
import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

// Clearly not a credential: a local mock only, never a real key.
const SECRET = "mock-paystack-secret-for-local-tests";
const CANONICAL_AMOUNT = 500_00; // 500 in kobo (minor unit)
const REFERENCE = "refi-test-reference-0001";

// Mock Paystack state.
let txStatus = "success";
let txAmount = CANONICAL_AMOUNT;
let txCurrency = "NGN";
let txReference = REFERENCE;
let txMetadata = { expected_amount_minor: CANONICAL_AMOUNT, expected_currency: "NGN" };

// Mock Supabase state.
let storeMode = "ok"; // ok | missing-table | error500 | unreachable
let storedRows = [];

function startMockPaystack() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");
      const send = (code, body) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === "/transaction/initialize") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        send(200, { status: true, data: { authorization_url: "https://checkout.paystack.com/mock", reference: body.reference } });
        return;
      }
      if (url.pathname.startsWith("/transaction/verify/")) {
        send(200, {
          status: true,
          data: {
            status: txStatus,
            amount: txAmount,
            currency: txCurrency,
            reference: txReference,
            paid_at: "2026-10-25T12:00:00.000Z",
            customer: { email: "donor@example.com" },
            metadata: txMetadata,
          },
        });
        return;
      }
      send(404, { status: false, message: "not found" });
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function startMockSupabase() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, "http://localhost");
      const send = (code, body) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (storeMode === "unreachable") { req.socket.destroy(); return; }

      if (req.method === "POST" && url.pathname === "/rest/v1/donations") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const rows = JSON.parse(Buffer.concat(chunks).toString() || "[]");
        if (storeMode === "missing-table") { send(404, { code: "42P01", message: "relation does not exist" }); return; }
        if (storeMode === "error500") { send(500, { message: "boom" }); return; }
        const row = rows[0];
        // Mirrors PostgREST with resolution=ignore-duplicates: an existing
        // reference is not written, and the representation comes back empty.
        if (storedRows.some((r) => r.reference === row.reference)) { send(201, []); return; }
        storedRows.push(row);
        send(201, [row]);
        return;
      }

      if (req.method === "GET" && url.pathname === "/rest/v1/donations") {
        if (storeMode === "missing-table") { send(404, { code: "42P01", message: "relation does not exist" }); return; }
        if (storeMode === "error500") { send(500, { message: "boom" }); return; }
        send(200, storedRows);
        return;
      }
      send(404, {});
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
  rmSync(".next/cache", { recursive: true, force: true });
  const port = await freePort();
  const child = spawn("npx", ["next", "start", "-p", String(port)], { env: { ...process.env, ...env }, stdio: "ignore" });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${origin}/donate`);
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
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
}

function sign(rawBody) {
  return createHmac("sha512", SECRET).update(rawBody).digest("hex");
}

async function postWebhook(origin, body, signature) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(`${origin}/api/paystack/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(signature ? { "x-paystack-signature": signature } : {}) },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function html(origin, path) {
  return (await fetch(`${origin}${path}`)).text();
}

async function json(origin, path) {
  return (await fetch(`${origin}${path}`)).json();
}

async function main() {
  console.log("building…");
  await run("npx", ["next", "build"]);

  const { server: paystack, port: paystackPort } = await startMockPaystack();
  const { server: supabase, port: supabasePort } = await startMockSupabase();
  const env = {
    PAYSTACK_SECRET_KEY: SECRET,
    PAYSTACK_API_BASE: `http://127.0.0.1:${paystackPort}`,
    SUPABASE_URL: `http://127.0.0.1:${supabasePort}`,
    SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key-for-local-tests",
  };

  let site = await startSite(env);

  // 1. A browser redirect must not be able to mark a donation successful.
  txStatus = "abandoned";
  const abandoned = await html(site.origin, `/donate/success?reference=${REFERENCE}`);
  check("abandoned payment is not shown as confirmed", !abandoned.includes("Donation confirmed."), "not confirmed");
  check("abandoned payment explains the state", abandoned.includes("Verification incomplete."), "incomplete shown");

  txStatus = "failed";
  check("failed payment is not shown as confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "not confirmed");

  txStatus = "pending";
  check("pending payment is not shown as confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "not confirmed");

  // 2. A genuinely successful payment is confirmed.
  txStatus = "success";
  txAmount = CANONICAL_AMOUNT;
  const okHtml = await html(site.origin, `/donate/success?reference=${REFERENCE}`);
  check("successful payment is confirmed", okHtml.includes("Donation confirmed."), "confirmed");

  // 3. An underpayment must not be confirmed as the expected donation.
  txAmount = 1_00;
  check("underpayment is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "mismatch rejected");
  txAmount = CANONICAL_AMOUNT;

  // 4. A currency mismatch must not be confirmed.
  txCurrency = "USD";
  check("currency mismatch is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "mismatch rejected");
  txCurrency = "NGN";

  // 5. Missing expected transaction metadata must fail closed.
  delete txMetadata.expected_amount_minor;
  check("missing expected amount metadata is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "missing expectation rejected");
  txMetadata.expected_amount_minor = CANONICAL_AMOUNT;

  delete txMetadata.expected_currency;
  check("missing expected currency metadata is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "missing expectation rejected");
  txMetadata.expected_currency = "NGN";

  txCurrency = "";
  check("missing returned currency is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "missing currency rejected");
  txCurrency = "NGN";

  txReference = "refi-different-reference";
  check("mismatched returned reference is not confirmed", !(await html(site.origin, `/donate/success?reference=${REFERENCE}`)).includes("Donation confirmed."), "reference mismatch rejected");
  txReference = REFERENCE;

  // 6. The verify endpoint reports truthfully and leaks nothing.
  const verifyBody = await json(site.origin, `/api/paystack/verify?reference=${REFERENCE}`);
  check("verify endpoint reports the verified amount", verifyBody.ok === true && verifyBody.amount === CANONICAL_AMOUNT, `amount ${verifyBody.amount}`);
  check("verify endpoint never returns the secret", !JSON.stringify(verifyBody).includes(SECRET), "secret absent");

  const noRef = await fetch(`${site.origin}/api/paystack/verify`);
  check("verify without a reference is rejected", noRef.status === 400, `status ${noRef.status}`);

  // 7. Initialize validates the amount server-side.
  const init = (payload) => fetch(`${site.origin}/api/paystack/initialize`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });

  check("initialize rejects an amount below the minimum", (await init({ email: "a@b.com", amount: 10 })).status === 400, "rejected");
  check("initialize rejects an amount above the maximum", (await init({ email: "a@b.com", amount: 999_999_999_999 })).status === 400, "rejected");
  check("initialize rejects an invalid email", (await init({ email: "not-an-email", amount: CANONICAL_AMOUNT })).status === 400, "rejected");
  check("initialize rejects a non-integer amount", (await init({ email: "a@b.com", amount: 100.5 })).status === 400, "rejected");

  const initOk = await init({ email: "donor@example.com", amount: CANONICAL_AMOUNT });
  const initOkBody = await initOk.json();
  check("initialize accepts a valid donation", initOk.status === 200 && Boolean(initOkBody.authorizationUrl), "started");
  check("initialize never returns the secret", !JSON.stringify(initOkBody).includes(SECRET), "secret absent");

  // 8. Webhook signature validation over the raw body.
  const event = { event: "charge.success", data: { reference: REFERENCE, status: "success" } };
  const rawBody = JSON.stringify(event);

  check("unsigned webhook is rejected", (await postWebhook(site.origin, event, null)).status === 401, "rejected");
  check("forged signature is rejected", (await postWebhook(site.origin, event, "deadbeef".repeat(16))).status === 401, "rejected");

  const tamperedBody = JSON.stringify({ event: "charge.success", data: { reference: REFERENCE, status: "success", amount: 1 } });
  check("tampered body with a valid signature is rejected", (await postWebhook(site.origin, tamperedBody, sign(rawBody))).status === 401, "rejected");

  // 9. A valid webhook records exactly once.
  storedRows = [];
  const good = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("signed webhook is accepted", good.status === 200 && good.body.verified === true, JSON.stringify(good.body));
  check("first delivery is recorded", good.body.recorded === true, "recorded");
  check("exactly one row stored", storedRows.length === 1, `${storedRows.length} row(s)`);

  // 10. A replayed webhook must not duplicate or inflate.
  const replay = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("replayed webhook is not recorded again", replay.body.recorded === false && replay.body.duplicate === true, JSON.stringify(replay.body));
  check("replay does not add a row", storedRows.length === 1, `${storedRows.length} row(s)`);

  // 11. A non-charge.success event is ignored.
  const otherEvent = JSON.stringify({ event: "charge.failed", data: { reference: REFERENCE } });
  const ignored = await postWebhook(site.origin, otherEvent, sign(otherEvent));
  check("non-success event is ignored", ignored.body.ignored === "charge.failed", JSON.stringify(ignored.body));

  // 12. A signed event that Paystack cannot confirm is not recorded.
  txStatus = "abandoned";
  const unverifiable = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("unverifiable payment is not recorded", unverifiable.body.verified === false, JSON.stringify(unverifiable.body));
  txStatus = "success";

  // 13. Totals distinguish a known zero from an unknown figure.
  storeMode = "ok";
  storedRows = [];
  const zero = await json(site.origin, "/api/campaigns/totals");
  check("empty store reports a known zero, not unavailable", zero.available === true && zero.total === 0, JSON.stringify({ available: zero.available, total: zero.total }));

  storedRows = [{ reference: REFERENCE, amount_minor: CANONICAL_AMOUNT, currency: "NGN", initiative: "REFI Play for Impact" }];
  const summed = await json(site.origin, "/api/campaigns/totals");
  check("totals sum only stored donations", summed.available === true && summed.total === CANONICAL_AMOUNT, `total ${summed.total}`);
  check("totals never expose donor details", !JSON.stringify(summed).includes("donor@example.com"), "no PII");

  storeMode = "error500";
  const broken = await json(site.origin, "/api/campaigns/totals");
  check("store failure reports unavailable, not zero", broken.available === false && broken.total === null, JSON.stringify({ available: broken.available, total: broken.total }));

  storeMode = "unreachable";
  const down = await json(site.origin, "/api/campaigns/totals");
  check("unreachable store reports unavailable, not zero", down.available === false && down.total === null, JSON.stringify({ available: down.available, total: down.total }));

  // 14. A storage failure must never be reported as a recorded donation.
  storeMode = "missing-table";
  storedRows = [];
  const missing = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("missing table is not reported as recorded", missing.body.recorded === false, JSON.stringify(missing.body));
  check("missing table reports an error", Boolean(missing.body.error), missing.body.error || "(none)");

  storeMode = "error500";
  const storeErr = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("store error is not reported as recorded", storeErr.body.recorded === false, JSON.stringify(storeErr.body));

  storeMode = "unreachable";
  const storeDown = await postWebhook(site.origin, rawBody, sign(rawBody));
  check("unreachable store is not reported as recorded", storeDown.body.recorded === false, JSON.stringify(storeDown.body));

  storeMode = "ok";
  const fundraise = await html(site.origin, "/fundraise");
  check("fundraise page does not invent a total", !/[0-9][0-9,]*\s*raised/.test(fundraise.replace(/Campaign totals are not available yet\./g, "")), "no invented figure");
  await stopSite(site.child);

  // 15. With no storage configured at all, totals stay unavailable.
  site = await startSite({ PAYSTACK_SECRET_KEY: SECRET, PAYSTACK_API_BASE: `http://127.0.0.1:${paystackPort}` });
  const unconfigured = await json(site.origin, "/api/campaigns/totals");
  check("no storage configured reports unavailable", unconfigured.available === false && unconfigured.total === null, JSON.stringify({ available: unconfigured.available }));
  await stopSite(site.child);

  // 16. With no Paystack key, payments report themselves as unconfigured.
  site = await startSite({ SUPABASE_URL: `http://127.0.0.1:${supabasePort}`, SUPABASE_SERVICE_ROLE_KEY: "k" });
  const noKeyVerify = await fetch(`${site.origin}/api/paystack/verify?reference=${REFERENCE}`);
  const noKeyBody = await noKeyVerify.json();
  check("verify without a key reports unconfigured", noKeyVerify.status === 503 && noKeyBody.configured === false, `status ${noKeyVerify.status}`);
  check("initialize without a key reports unconfigured", (await init({ email: "donor@example.com", amount: CANONICAL_AMOUNT })).status === 503, "reported");
  await stopSite(site.child);

  paystack.close();
  supabase.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("failures:");
    for (const f of failed) console.log(`  - ${f.name}`);
    process.exit(1);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
