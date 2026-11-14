import { NextResponse } from "next/server";
import { getCampaignTotals } from "@/lib/donations";

export const runtime = "nodejs";

/**
 * Campaign totals, derived only from persisted verified donations.
 *
 * `available: true` with a zero total means the store was queried and there are
 * genuinely no donations yet. `available: false` means the figure could not be
 * established, so the UI must say it is unavailable rather than implying that
 * nothing has been raised.
 */
export async function GET() {
  const totals = await getCampaignTotals("REFI Play for Impact");

  if (!totals.available) {
    const message = totals.reason === "not-configured"
      ? "Donation storage is not configured yet, so campaign totals are not available."
      : "Campaign totals could not be read from the donation store, so no figure is being reported.";
    return NextResponse.json(
      { available: false, total: null, currency: null, donationCount: null, message },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { available: true, total: totals.totalMinor, currency: totals.currency, donationCount: totals.donationCount, updatedAt: totals.updatedAt },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
