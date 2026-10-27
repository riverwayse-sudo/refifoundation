import { NextResponse } from "next/server";
import { getCampaignTotals, persistenceConfigured } from "@/lib/donations";

export const runtime = "nodejs";
export const revalidate = 60;

/**
 * Campaign totals, derived only from persisted verified donations.
 *
 * When no durable store is configured this returns `available: false` with a
 * null total rather than a zero or a guess, so the UI can say the figure is
 * unavailable instead of implying that nothing has been raised.
 */
export async function GET() {
  const totals = await getCampaignTotals("REFI Play for Impact");

  if (!persistenceConfigured()) {
    return NextResponse.json(
      { available: false, total: null, currency: null, donationCount: null, message: "Donation storage is not configured yet, so campaign totals are not available." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (totals === null) {
    return NextResponse.json(
      { available: false, total: null, currency: null, donationCount: null, message: "No verified donations have been recorded yet." },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  }

  return NextResponse.json(
    { available: true, total: totals.totalMinor, currency: totals.currency, donationCount: totals.donationCount, updatedAt: totals.updatedAt },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
