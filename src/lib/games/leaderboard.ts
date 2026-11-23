/**
 * Persistent game scores and the per-game leaderboard.
 *
 * Storage is optional, exactly like donations: when the Supabase service role is
 * configured, verified rounds are stored through PostgREST; when it is not, the
 * submission is validated against a server session and then reported as not
 * stored. The leaderboard never invents rows, and never reports an unreachable
 * store as "nothing scored yet".
 *
 * The unique constraint on (session_id, game) is what makes a replayed
 * submission a no-op rather than a second entry.
 */

import { serviceRequest } from "../cms/supabase";
import type { GameSlug } from "./types";

export type ScoreRow = {
  displayName: string;
  score: number;
  durationMs: number;
  createdAt: string;
};

export type Leaderboard =
  | { available: true; rows: ScoreRow[] }
  | { available: false; reason: "not-configured" | "unavailable" };

export type StoreResult = {
  stored: boolean;
  duplicate: boolean;
  persistence: boolean;
  error?: string;
};

/** Rows returned per game. The leaderboard is a top-ten, not a full table dump. */
export const LEADERBOARD_LIMIT = 10;

export function scoresConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Store one verified round.
 *
 * `ignore-duplicates` is deliberate. With `merge-duplicates` a replay would
 * overwrite the stored row and be reported as a fresh insert, so the caller could
 * not tell a retry from a new round.
 */
export async function recordScore(input: {
  sessionId: string;
  game: GameSlug;
  score: number;
  durationMs: number;
  displayName: string;
}): Promise<StoreResult> {
  if (!scoresConfigured()) {
    return { stored: false, duplicate: false, persistence: false };
  }

  const result = await serviceRequest<unknown[] | null>("game_scores", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: [{
      session_id: input.sessionId,
      game: input.game,
      score: input.score,
      duration_ms: input.durationMs,
      display_name: input.displayName,
    }],
  });

  if (!result.ok) {
    // A unique violation that could not be ignored is still a duplicate.
    if (result.status === 409) return { stored: false, duplicate: true, persistence: true };
    const setupGap = result.status === 404 || result.status === 400;
    return {
      stored: false,
      duplicate: false,
      persistence: true,
      error: setupGap
        ? "The score store is not ready. The game_scores table may not exist yet."
        : `The score store rejected the round (${result.status || "network"}).`,
    };
  }

  const rows = Array.isArray(result.data) ? result.data : [];
  return { stored: rows.length > 0, duplicate: rows.length === 0, persistence: true };
}

/** Best score per game, highest first, earliest first on a tie. */
export async function getTopScores(game: GameSlug, limit: number = LEADERBOARD_LIMIT): Promise<Leaderboard> {
  if (!scoresConfigured()) return { available: false, reason: "not-configured" };

  const query = new URLSearchParams({
    select: "display_name,score,duration_ms,created_at",
    game: `eq.${game}`,
    order: "score.desc,created_at.asc",
    limit: String(limit),
  });

  const result = await serviceRequest<Record<string, unknown>[]>(`game_scores?${query.toString()}`);
  if (!result.ok || !Array.isArray(result.data)) return { available: false, reason: "unavailable" };

  const rows = result.data
    .map((row) => ({
      displayName: typeof row.display_name === "string" ? row.display_name : "",
      score: typeof row.score === "number" ? row.score : Number.NaN,
      durationMs: typeof row.duration_ms === "number" ? row.duration_ms : Number.NaN,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    }))
    // A malformed row is dropped rather than rendered as a blank entry.
    .filter((row) => row.displayName.length > 0 && Number.isFinite(row.score) && row.createdAt.length > 0);

  return { available: true, rows };
}
