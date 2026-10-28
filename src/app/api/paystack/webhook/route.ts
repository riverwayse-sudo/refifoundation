import { NextResponse } from "next/server";
import { isValidWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { recordDonation } from "@/lib/donations";

export const runtime = "nodejs";

/**
 * Paystack webhook receiver.
 *
 * Four things matter here:
 *  1. The signature is checked against the raw body, so an unsigned or forged
 *     request cannot create a donation.
 *  2. The event is only trusted after Paystack's own verify endpoint confirms
 *     the transaction, so a spoofed "success" event alone is not enough. That
 *     verification also checks the amount and currency against the expectations
 *     recorded at initialize time, so an underpayment cannot be recorded as the
 *     full donation.
 *  3. Recording is idempotent on the reference, so a retried delivery does not
 *     count the same donation twice.
 *  4. A storage failure is reported as a failure. The endpoint still answers
 *     200 so Paystack does not retry a delivery that will not change, but it
 *     never claims a donation was recorded when it was not.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!(await isValidWebhookSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true, ignored: "unparseable" }, { headers: { "Cache-Control": "no-store" } });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: event.event || "unknown" }, { headers: { "Cache-Control": "no-store" } });
  }

  const reference = event.data?.reference?.trim();
  if (!reference) {
    return NextResponse.json({ received: true, ignored: "missing reference" }, { headers: { "Cache-Control": "no-store" } });
  }

  // Never trust the event body's own status or amount; ask Paystack, and check
  // the amount against what was recorded when the payment was started.
  const verified = await verifyTransaction(reference);
  if (!verified.ok || verified.amountMinor === null) {
    return NextResponse.json({ received: true, verified: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const result = await recordDonation({
    reference: verified.reference ?? reference,
    amountMinor: verified.amountMinor,
    currency: verified.currency ?? "NGN",
    donorEmail: verified.donorEmail,
    donorName: null,
    initiative: "REFI Play for Impact",
    paidAt: verified.paidAt,
  });

  return NextResponse.json(
    {
      received: true,
      verified: true,
      // `recorded` is true only when a durable store accepted the row.
      recorded: result.stored,
      duplicate: result.duplicate,
      persisted: result.persistence,
      error: result.error,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
