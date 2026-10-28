import { NextResponse } from "next/server";
import { fetchLiveMatches, REFRESH_SECONDS } from "@/lib/football/live";

export const runtime = "nodejs";

/**
 * Live match feed.
 *
 * The upstream call is cached for REFRESH_SECONDS, so browser polling does not
 * translate into provider requests. The response is cacheable for the same
 * window so a CDN edge serves repeat requests without invoking this function.
 *
 * Note there is no `revalidate = 30` here: a 30-second window would exceed the
 * provider's free daily allowance on its own.
 */
export async function GET() {
  const feed = await fetchLiveMatches();

  const status = feed.configured === false ? 503 : 200;
  const headers = feed.configured
    ? { "Cache-Control": `public, s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=${REFRESH_SECONDS * 2}` }
    : { "Cache-Control": "no-store" };

  return NextResponse.json(feed, { status, headers });
}
