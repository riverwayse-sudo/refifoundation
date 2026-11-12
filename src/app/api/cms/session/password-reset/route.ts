import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/cms/auth";
import { clientKey, rateLimit } from "@/lib/cms/rate-limit";

export const runtime = "nodejs";

// Sends a reset email. Always returns success so the endpoint cannot be used to
// discover which addresses have accounts.
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "reset"), 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email } = (body ?? {}) as { email?: unknown };
  if (typeof email === "string" && email.includes("@")) {
    await requestPasswordReset(email.trim());
  }

  return NextResponse.json(
    { ok: true, message: "If that email has an account, a reset link is on its way." },
    { headers: { "Cache-Control": "no-store" } },
  );
}
