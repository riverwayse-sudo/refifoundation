import type { LiveMatch, MatchStatus } from "@/lib/football/types";

/**
 * Live football feed.
 *
 * The provider's free tier is small and is metered per day, so this module is
 * built around not spending requests carelessly:
 *
 *  - One upstream request serves every visitor. The result is cached in the
 *    Next.js data cache, so traffic does not translate into provider calls.
 *  - Concurrent cache misses share one in-flight request instead of each
 *    starting its own, so a burst of traffic cannot stampede the provider.
 *  - The daily ceiling is taken from the provider's own rate-limit response
 *    headers rather than a hardcoded guess, so it tracks whatever plan the
 *    Foundation is actually on.
 *  - A daily guard stops calling upstream once that ceiling is nearly spent, so
 *    the feed degrades to an honest message instead of silently breaking for
 *    the rest of the day.
 *  - There are no automatic retries: a failed call does not spend more of the
 *    remaining allowance.
 *
 * Without the caching, a 30-second revalidate alone would be 2,880 requests a
 * day, far beyond the free allowance, which is the defect this module corrects.
 */

// Overridable so the feed can be pointed at a staging or mock provider during
// testing without editing code.
const API_BASE = process.env.FOOTBALL_API_BASE?.trim() || "https://v3.football.api-sports.io";

// Premier League = 39, UEFA Champions League = 2. Nigerian competitions are
// matched by country and league type because the provider can change Nigerian
// league IDs between seasons.
const EPL_LEAGUE_ID = 39;
const UCL_LEAGUE_ID = 2;

/**
 * Seconds a fetched payload is reused before another upstream call is allowed.
 * Defaults to 120. FOOTBALL_REFRESH_SECONDS overrides it, which lets the
 * safeguards be exercised deterministically in tests; lowering it increases
 * provider usage, so the daily guard remains the actual spend limit.
 */
function resolveRefreshSeconds(): number {
  const configured = Number(process.env.FOOTBALL_REFRESH_SECONDS);
  return Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : 120;
}

export const REFRESH_SECONDS = resolveRefreshSeconds();

/**
 * How much of the provider's reported daily allowance we are willing to use.
 *
 * The absolute limit is read from the provider's `x-ratelimit-requests-limit`
 * response header, so it reflects the real account plan rather than an
 * assumption. This fraction is the safety margin, leaving headroom for manual
 * checks and for per-instance counting drift across serverless instances.
 */
const BUDGET_FRACTION = 0.9;

/**
 * Ceiling used only until the provider has reported its own limit (for example
 * on the first request of a cold instance). Deliberately conservative.
 * LIVE_SCORE_DAILY_BUDGET overrides this when an operator knows the real plan.
 */
function fallbackBudget(): number {
  return 90;
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
  /** True when the daily provider budget is spent and no upstream call was made. */
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
 * Per-instance request accounting for the current UTC day.
 *
 * Serverless instances do not share memory, so this bounds the spend of a warm
 * instance rather than the whole account. The hard cap on total spend is the
 * revalidate window, which limits how often any instance may call upstream.
 */
let budgetDay = "";
let budgetUsed = 0;
/** Highest daily limit the provider has reported, used to size the guard. */
let reportedLimit = 0;

function rollDayIfNeeded(): void {
  const current = new Date().toISOString().slice(0, 10);
  if (current !== budgetDay) {
    budgetDay = current;
    budgetUsed = 0;
  }
}

/**
 * The ceiling in force, in order of precedence:
 *  1. LIVE_SCORE_DAILY_BUDGET, when an operator has set it explicitly.
 *  2. The provider's reported daily limit, less the safety margin.
 *  3. A conservative fallback until the provider has told us its limit.
 */
function effectiveBudget(): number {
  const configured = Number(process.env.LIVE_SCORE_DAILY_BUDGET);
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return reportedLimit > 0 ? Math.floor(reportedLimit * BUDGET_FRACTION) : fallbackBudget();
}

/**
 * Take a slot before calling upstream. Returns false when the day's ceiling has
 * been reached, in which case no upstream request is made at all.
 */
function takeBudgetSlot(): boolean {
  rollDayIfNeeded();
  if (budgetUsed >= effectiveBudget()) return false;
  budgetUsed += 1;
  return true;
}

/**
 * Record what the provider says about this account's limits. Reading the real
 * value avoids both under-counting, which risks a surprise overage, and
 * over-counting, which would needlessly disable the feed.
 */
function noteProviderLimits(response: Response): void {
  const limit = Number(response.headers.get("x-ratelimit-requests-limit"));
  const current = Number(response.headers.get("x-ratelimit-requests-current"));
  if (Number.isFinite(limit) && limit > 0) reportedLimit = limit;
  // If the provider counts more usage than we did, trust the provider.
  if (Number.isFinite(current) && current > budgetUsed) budgetUsed = current;
}

export function footballConfigured(): boolean {
  const key = process.env.API_FOOTBALL_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Shares one in-flight request between concurrent callers, so a burst of cache
 * misses produces a single upstream call rather than one per caller.
 */
let inFlight: Promise<LiveFeed> | null = null;

async function loadFeed(apiKey: string): Promise<LiveFeed> {
  const now = new Date().toISOString();

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

    noteProviderLimits(response);

    if (response.status === 429) {
      // A quota response is definitive, so treat the rest of the day as spent
      // rather than probing again on the next request.
      budgetUsed = Math.max(budgetUsed, effectiveBudget());
      return {
        configured: true,
        matches: [],
        updatedAt: now,
        budgetExhausted: true,
        message: "Live scores have reached today's provider limit. The feed will resume automatically when the limit resets.",
      };
    }

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

export async function fetchLiveMatches(): Promise<LiveFeed> {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();

  if (!apiKey) {
    return {
      configured: false,
      matches: [],
      updatedAt: new Date().toISOString(),
      message: "Live scores are not connected yet. Add API_FOOTBALL_KEY after confirming the required competition coverage and provider plan.",
    };
  }

  if (inFlight) return inFlight;

  inFlight = loadFeed(apiKey).finally(() => { inFlight = null; });
  return inFlight;
}
