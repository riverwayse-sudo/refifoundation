export const runtime = "nodejs";

const MAX_BODY_BYTES = 12_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}

const TOPICS = new Set([
  "General enquiry",
  "Programme or community support",
  "Partnership or sponsorship",
  "Volunteering",
  "Media and communications",
]);

// Best-effort per-instance throttling. Serverless instances do not share memory;
// enforce a hard edge-level limit at the hosting layer before production launch.
// Bound both key count and lifetime so attacker-controlled addresses cannot grow
// this map indefinitely. Proxy chains append addresses; use the rightmost value.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_RATE_KEYS = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();
let rateLimitCalls = 0;

function pruneRateLimits(now: number): void {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
  while (attempts.size >= MAX_RATE_KEYS) {
    const oldest = attempts.keys().next().value;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
}

function isRateLimited(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const forwardedAddresses = forwarded.split(",").map((value) => value.trim()).filter(Boolean);
  const ip = forwardedAddresses.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";
  const now = Date.now();

  // Sweep periodically rather than on every request. The hard cap remains active
  // on every insertion, including during high-cardinality traffic.
  rateLimitCalls += 1;
  if (rateLimitCalls % 64 === 0 || attempts.size >= MAX_RATE_KEYS) pruneRateLimits(now);

  const key = `contact:${ip}`;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    if (attempts.size >= MAX_RATE_KEYS) pruneRateLimits(now);
    attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return null;
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) throw new RangeError("body-too-large");
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("body-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown> : null;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) {
    return jsonResponse(
      { error: "Too many enquiries have been submitted. Please wait a little and try again." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  let input: Record<string, unknown> | null;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    const tooLarge = error instanceof RangeError && error.message === "body-too-large";
    return jsonResponse(
      { error: tooLarge ? "Your message is too large. Please shorten it and try again." : "Please submit a valid enquiry form." },
      { status: tooLarge ? 413 : 400 },
    );
  }
  if (!input) return jsonResponse({ error: "Please submit a valid enquiry form." }, { status: 400 });
  if (clean(input.website, 200)) return jsonResponse({ ok: true });

  const name = clean(input.name, 100);
  const email = clean(input.email, 254);
  const topic = clean(input.topic, 100);
  const message = clean(input.message, 4000);
  if (!name || !EMAIL_PATTERN.test(email) || !TOPICS.has(topic) || message.length < 10) {
    return jsonResponse({ error: "Please check your name, email, topic and message, then try again." }, { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const recipient = process.env.REFI_CONTACT_EMAIL;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "REFI Foundation";
  if (!apiKey || !recipient || !senderEmail) {
    return jsonResponse(
      { error: "The enquiry service is not configured yet. Please email hello@refifoundation.org directly." },
      { status: 503 },
    );
  }

  const textContent = [
    "New enquiry from the REFI Foundation website", "", `Name: ${name}`,
    `Email: ${email}`, `Topic: ${topic}`, "", "Message:", message,
  ].join("\n");

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipient }],
        replyTo: { email, name },
        subject: `REFI website enquiry: ${topic}`,
        textContent,
        htmlContent: `<h2>New REFI Foundation website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return jsonResponse({ error: "We could not send your message right now. Please email hello@refifoundation.org directly." }, { status: 502 });
    }
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: "We could not send your message right now. Please email hello@refifoundation.org directly." }, { status: 502 });
  }
}
