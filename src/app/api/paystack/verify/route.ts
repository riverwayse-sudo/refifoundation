import { NextResponse } from "next/server";
import { paystackSecret, verifyTransaction } from "@/lib/paystack";

export const runtime = "nodejs";

/**
 * Server-side verification of a single donation reference.
 *
 * The success page and the game both call this rather than trusting the query
 * string, so a reference is only reported as a confirmed donation when Paystack
 * confirms it. Responses are never cached.
 */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference) {
    return NextResponse.json(
      { ok: false, error: "A payment reference is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!paystackSecret()) {
    return NextResponse.json(
      { ok: false, configured: false, error: "Payment verification is not configured yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await verifyTransaction(reference);
  return NextResponse.json(
    {
      ok: result.ok,
      configured: true,
      reference: result.reference,
      amount: result.amountMinor,
      currency: result.currency,
      status: result.status,
      paidAt: result.paidAt,
      error: result.ok ? undefined : result.error,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
