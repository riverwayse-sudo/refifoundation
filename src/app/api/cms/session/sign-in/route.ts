import { NextResponse } from "next/server";
import { isCmsAdmin, signIn } from "@/lib/cms/auth";
import { clientKey, rateLimit, resetRateLimit } from "@/lib/cms/rate-limit";

export const runtime = "nodejs";

// Sign-in. Rate limited per client to slow password guessing.
export async function POST(request: Request) {
  const key = clientKey(request, "signin");
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await signIn(email.trim(), password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Authentication alone is not enough: the account must also be an authorised
  // administrator, otherwise a valid login would grant dashboard access.
  if (!(await isCmsAdmin(result.user.id))) {
    return NextResponse.json(
      { error: "This account does not have CMS access. Ask an administrator to add you." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  resetRateLimit(key);
  return NextResponse.json(
    { user: { email: result.user.email } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
