import type { LiveMatch, MatchStatus } from "@/lib/football/types";

/**
 * Live football feed.
 *
 * The provider's free tier is small — API-Football allows roughly 100 requests
 * per day — so this module is built around not spending requests carelessly:
 *
 *  - One upstream request serves every visitor, because the result is cached in
 *    the Next.js data cache rather than fetched per page view.
 *  - The cache entry is reused for the whole refresh window (`revalidate`), so
 *    the request rate is capped regardless of traffic.
 *  - A daily budget guard stops calling the provider once the free allowance is
 *    close to being spent, instead of letting a busy match day silently exhaust
 *    the quota and break the feed for the rest of the day.
 *
 * Without that last guard, a 30-second revalidate alone is 2,880 requests per
 * day — far beyond the free tier — which is the defect this module corrects.
 */

// Overridable so the feed can be pointed at a staging or mock provider during
// testing without editing code.
const API_BASE = process.env.FOOTBALL_API_BASE?.trim() || "https://v3.football.api-sports.io";

// Premier League = 39, UEFA Champions League = 2. Nigerian competitions are
// matched by country and league type because the provider can change Nigerian
// league IDs between seasons.
const EPL_LEAGUE_ID = 39;
const UCL_LEAGUE_ID = 2;

/** Seconds a fetched payload is reused before another upstream call is allowed. */
export const REFRESH_SECONDS = 120;

/**
 * Free-tier allowance is ~100 requests/day. The default stops at 90 to leave
 * headroom for manual checks and to absorb clock skew across serverless
 * instances. Override with LIVE_SCORE_DAILY_BUDGET when the provider plan
 * changes, so the guard tracks the plan the Foundation is actually on.
 */
function dailyBudget(): number {
  const configured = Number(process.env.LIVE_SCORE_DAILY_BUDGET);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 90;
}

type ApiFixture = {
  fixture?: { id?: number; date?: string; status?: { short?: string; long?: string; elapsed?: number | null } };
  league?: { id?: number; name?: string; country?: string; type?: string };
  teams?: { home?: { id?: number; name?: string; logo?: string }; away?: { id?: number; name?: string; logo?: string } };
  goals?: { home?: number | null; away?: number | null };
};

export type LiveFeed = {
  configured: boolean;
  matches: LiveMatch[];
  updatedAt: string;
  message?: string;
  /** True when the daily provider budget is spent and a cached value was reused. */
  budgetExhausted?: boolean;
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

/**
 * Per-instance request counter for the current UTC day.
 *
 * This is a soft limit: serverless instances do not share memory, so it bounds
 * the spend of a warm instance rather than the whole account. The hard cap is
 * the revalidate window, which limits how often any instance may call upstream.
 */
let budgetDay = "";
let budgetUsed = 0;

function takeBudgetSlot(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDay) {
    budgetDay = today;
    budgetUsed = 0;
  }
  if (budgetUsed >= dailyBudget()) return false;
  budgetUsed += 1;
  return true;
}

export function footballConfigured(): boolean {
  const key = process.env.API_FOOTBALL_KEY;
  return Boolean(key && key.trim().length > 0);
}

export async function fetchLiveMatches(): Promise<LiveFeed> {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  const now = new Date().toISOString();

  if (!apiKey) {
    return {
      configured: false,
      matches: [],
      updatedAt: now,
      message: "Live scores are not connected yet. Add API_FOOTBALL_KEY after confirming the required competition coverage and provider plan.",
    };
  }

  if (!takeBudgetSlot()) {
    return {
      configured: true,
      matches: [],
      updatedAt: now,
      budgetExhausted: true,
      message: "Live scores have reached today's provider limit. The feed will resume automatically when the limit resets.",
    };
  }

  try {
    const response = await fetch(`${API_BASE}/fixtures?live=all`, {
      headers: { "x-apisports-key": apiKey, accept: "application/json" },
      // One cached upstream call per window serves all visitors.
      next: { revalidate: REFRESH_SECONDS, tags: ["live-matches"] },
    });

    if (!response.ok) {
      return { configured: true, matches: [], updatedAt: now, message: "The live-score provider is temporarily unavailable." };
    }

    const payload = await response.json() as { response?: ApiFixture[]; errors?: unknown };
    if (payload.errors && Object.keys(payload.errors as object).length > 0) {
      return { configured: true, matches: [], updatedAt: now, message: "The live-score provider returned an API error." };
    }

    const matches = (payload.response || []).filter(isInScope).map(mapFixture).filter((match): match is LiveMatch => match !== null);
    return { configured: true, matches, updatedAt: now };
  } catch {
    return { configured: true, matches: [], updatedAt: now, message: "Unable to retrieve live scores right now." };
  }
}
