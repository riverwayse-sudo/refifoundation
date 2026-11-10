import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 12_000;
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;

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
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

export async function POST(request: Request) {
  let input: Record<string, unknown> | null;
  try {
    input = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RangeError && error.message === "body-too-large") {
      return NextResponse.json({ error: "Your message is too large. Please shorten it and try again." }, { status: 413 });
    }
    return NextResponse.json({ error: "Please submit a valid enquiry form." }, { status: 400 });
  }

  if (!input) {
    return NextResponse.json({ error: "Please submit a valid enquiry form." }, { status: 400 });
  }

  // Quietly accept honeypot submissions without forwarding spam.
  if (clean(input.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(input.name, 100);
  const email = clean(input.email, 254);
  const topic = clean(input.topic, 100);
  const message = clean(input.message, 4000);
  const allowedTopics = new Set([
    "General enquiry",
    "Programme or community support",
    "Partnership or sponsorship",
    "Volunteering",
    "Media and communications",
  ]);

  if (!name || !EMAIL_PATTERN.test(email) || !allowedTopics.has(topic) || message.length < 10) {
    return NextResponse.json({ error: "Please check your name, email, topic and message, then try again." }, { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const recipient = process.env.REFI_CONTACT_EMAIL;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "REFI Foundation";

  if (!apiKey || !recipient || !senderEmail) {
    return NextResponse.json(
      { error: "The enquiry service is not configured yet. Please email hello@refifoundation.org directly." },
      { status: 503 },
    );
  }

  const textContent = [
    "New enquiry from the REFI Foundation website",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Topic: ${topic}`,
    "",
    "Message:",
    message,
  ].join("\\n");

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipient }],
        replyTo: { email, name },
        subject: `REFI website enquiry: ${topic}`,
        textContent,
        htmlContent: `<h2>New REFI Foundation website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\\n/g, "<br>")}</p>`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "We could not send your message right now. Please email hello@refifoundation.org directly." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "We could not send your message right now. Please email hello@refifoundation.org directly." },
      { status: 502 },
    );
  }
}
