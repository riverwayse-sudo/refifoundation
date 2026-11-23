import { NextResponse } from "next/server";
import { createFundraiser, listFundraisers, validateFundraiser } from "@/lib/fundraisers";
import { rateLimit } from "@/lib/cms/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1_024;

/** Public list of active campaigns with their confirmed totals. */
export async function GET() {
  const list = await listFundraisers();
  if (!list.available) {
    return NextResponse.json(
      {
        available: false,
        items: [],
        message: list.reason === "not-configured"
          ? "Campaign storage is not configured on this deployment yet."
          : "Campaigns could not be read just now.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { available: true, items: list.items },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}

/**
 * Creates a campaign. Open to the public, so it is bounded: a small body, a
 * per-client rate limit, sanitised values, and no field that could publish a
 * total. Totals come only from confirmed payments.
 */
export async function POST(request: Request) {
  const forwarded = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const ip = forwarded.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";

  // Three new campaigns an hour from one address is generous for a person and
  // useless for a script.
  const limit = rateLimit(`fundraiser:create:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many campaigns created from this connection. Please try again later." },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(limit.retryAfterSeconds || 60) } },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "The request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A valid JSON body is required." }, { status: 400 });
  }

  const checked = validateFundraiser(payload);
  if (!checked.ok) {
    return NextResponse.json({ ok: false, errors: checked.errors }, { status: 422 });
  }

  const created = await createFundraiser(checked.value);
  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: created.status });
  }

  return NextResponse.json(
    { ok: true, fundraiser: created.fundraiser, url: `/fundraise/${created.fundraiser.slug}` },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
