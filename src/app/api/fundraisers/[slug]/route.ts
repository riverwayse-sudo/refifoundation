import { NextResponse } from "next/server";
import { getFundraiser } from "@/lib/fundraisers";

export const runtime = "nodejs";

/**
 * Public summary of one campaign.
 *
 * Only public fields are returned: no donor email, no donor name. The total is
 * the confirmed sum held by the database view.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getFundraiser(slug);

  if (!result.available) {
    const status = result.reason === "missing" ? 404 : result.reason === "not-configured" ? 503 : 502;
    return NextResponse.json(
      {
        available: false,
        reason: result.reason,
        error: result.reason === "missing"
          ? "That fundraiser does not exist or is not public."
          : result.reason === "not-configured"
            ? "Campaign storage is not configured on this deployment yet."
            : "The campaign could not be read just now.",
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { fundraiser } = result;
  return NextResponse.json(
    {
      available: true,
      fundraiser: {
        slug: fundraiser.slug,
        title: fundraiser.title,
        organiserName: fundraiser.organiserName,
        story: fundraiser.story,
        game: fundraiser.game,
        targetMinor: fundraiser.targetMinor,
        totalMinor: fundraiser.totalMinor,
        donationCount: fundraiser.donationCount,
        createdAt: fundraiser.createdAt,
        currency: "NGN",
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
