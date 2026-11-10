import { NextResponse } from "next/server";
import type { LiveMatch, MatchStatus } from "@/lib/football/types";

export const runtime = "nodejs";
export const revalidate = 30;

// API-Football league IDs: Premier League = 39, UEFA Champions League = 2.
// Nigerian competitions are selected by country and league type because the
// provider may add/change Nigerian league IDs across seasons.
const EPL_LEAGUE_ID = 39;
const UCL_LEAGUE_ID = 2;

type ApiFixture = {
  fixture?: { id?: number; date?: string; status?: { short?: string; long?: string; elapsed?: number | null } };
  league?: { id?: number; name?: string; country?: string; type?: string };
  teams?: { home?: { id?: number; name?: string; logo?: string }; away?: { id?: number; name?: string; logo?: string } };
  goals?: { home?: number | null; away?: number | null };
};

const LIVE_CODES = new Set(["1H", "HT", "2H", "ET", "P", "LIVE", "INT"]);

function isInScope(item: ApiFixture): boolean {
  const league = item.league;
  if (!league) return false;
  if (league.id === EPL_LEAGUE_ID || league.id === UCL_LEAGUE_ID) return true;
  return league.country?.trim().toLowerCase() === "nigeria"
    && (league.type?.trim().toLowerCase() === "league" || !league.type);
}

function mapFixture(item: ApiFixture): LiveMatch | null {
  const fixtureId = item.fixture?.id;
  if (typeof fixtureId !== "number") return null;
  const code = item.fixture?.status?.short || "UNKNOWN";
  const status: MatchStatus = LIVE_CODES.has(code) ? (code === "HT" ? "HT" : code === "INT" ? "INT" : "LIVE")
    : code === "FT" || code === "AET" || code === "PEN" ? "FT"
    : code === "NS" || code === "TBD" ? "NS"
    : code === "PST" ? "PST"
    : code === "CANC" ? "CANC" : "UNKNOWN";
  return {
    fixtureId,
    competition: item.league?.name || "Football",
    country: item.league?.country || null,
    kickoff: item.fixture?.date || new Date().toISOString(),
    elapsedMinutes: item.fixture?.status?.elapsed ?? null,
    status,
    statusLabel: item.fixture?.status?.long || code,
    home: { id: item.teams?.home?.id ?? null, name: item.teams?.home?.name || "Home team", logo: item.teams?.home?.logo || null },
    away: { id: item.teams?.away?.id ?? null, name: item.teams?.away?.name || "Away team", logo: item.teams?.away?.logo || null },
    homeScore: item.goals?.home ?? null,
    awayScore: item.goals?.away ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { configured: false, matches: [], message: "Live scores are not connected yet. Add API_FOOTBALL_KEY after confirming the required competition coverage and provider plan." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": apiKey, accept: "application/json" },
      next: { revalidate: 30 },
    });
    if (!response.ok) {
      return NextResponse.json({ configured: true, matches: [], message: "The live-score provider is temporarily unavailable." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const payload = await response.json() as { response?: ApiFixture[]; errors?: unknown };
    if (payload.errors && Object.keys(payload.errors as object).length > 0) {
      return NextResponse.json({ configured: true, matches: [], message: "The live-score provider returned an API error." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const matches = (payload.response || []).filter(isInScope).map(mapFixture).filter((match): match is LiveMatch => match !== null);
    return NextResponse.json({ configured: true, matches, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ configured: true, matches: [], message: "Unable to retrieve live scores right now." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
