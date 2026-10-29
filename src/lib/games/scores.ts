/**
 * Server-side validation for score submissions.
 *
 * A score that arrives from a browser is untrusted: it can be edited, replayed
 * or sent by a script. Nothing here treats a submission as a fact. It checks
 * that the payload is well formed, that the game is one we publish, that the
 * score is an integer inside the bounds declared for that game, and that the
 * round looks like it could actually have been played.
 *
 * This module deliberately does not claim a submission is *authentic*. There is
 * no authoritative replay of the game on the server, so a determined client can
 * still fabricate a plausible score. That is why the public leaderboard stays
 * disabled until scores are persisted against a server-issued session.
 */

import { getGame, GAME_SLUGS } from "./catalog";
import type { GameDefinition, GameSlug } from "./types";

/** Hard cap on a submission body, so an oversized payload is rejected early. */
export const MAX_SCORE_BODY_BYTES = 2_048;

/** Display-name limits. Kept short and privacy-conscious. */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 24;

/** A round shorter than this cannot be a genuine completion. */
export const MIN_ROUND_MS = 1_000;

/** A round longer than this is not believable for any game here. */
export const MAX_ROUND_MS = 60 * 60 * 1_000;

export type ScoreSubmission = {
  game: GameSlug;
  score: number;
  durationMs: number;
  completed: boolean;
  displayName: string;
};

export type ValidationResult =
  | { ok: true; value: ScoreSubmission }
  | { ok: false; errors: string[] };

/**
 * Reject a display name that is really an email address or a link, so contact
 * details and off-site links never reach a public surface.
 */
export function isPrivateOrLinky(name: string): boolean {
  return /@/.test(name) || /https?:\/\//i.test(name) || /www\./i.test(name);
}

/** Keep only characters that are safe to display: letters, digits, space and a few marks. */
export function sanitiseDisplayName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[^\p{L}\p{N} ._-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX_LENGTH);
}

export function validateDisplayName(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const original = String(raw ?? "");
  if (isPrivateOrLinky(original)) {
    return { ok: false, error: "Display names cannot contain an email address or a link." };
  }
  const value = sanitiseDisplayName(original);
  if (value.length < NAME_MIN_LENGTH) {
    return { ok: false, error: `Display name must be at least ${NAME_MIN_LENGTH} characters.` };
  }
  return { ok: true, value };
}

function isGameSlug(value: unknown): value is GameSlug {
  return typeof value === "string" && (GAME_SLUGS as string[]).includes(value);
}

/**
 * Validate a whole submission. Collects every problem rather than stopping at
 * the first, so an API consumer gets an actionable response.
 */
export function validateScoreSubmission(payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, errors: ["A JSON object body is required."] };
  }
  const body = payload as Record<string, unknown>;

  if (!isGameSlug(body.game)) {
    return { ok: false, errors: ["Unknown game identifier."] };
  }
  const game: GameDefinition = getGame(body.game)!;

  const score = body.score;
  if (typeof score !== "number" || !Number.isInteger(score)) {
    errors.push("Score must be a whole number.");
  } else if (score < game.scoreRule.min || score > game.scoreRule.max) {
    errors.push(`Score must be between ${game.scoreRule.min} and ${game.scoreRule.max} for ${game.title}.`);
  }

  const durationMs = body.durationMs;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    errors.push("A round duration is required.");
  } else if (durationMs < MIN_ROUND_MS || durationMs > MAX_ROUND_MS) {
    errors.push("The round duration is not within a believable range.");
  }

  if (body.completed !== true) {
    errors.push("Only completed rounds can be submitted.");
  }

  const name = validateDisplayName(body.displayName);
  if (!name.ok) errors.push(name.error);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      game: body.game,
      score: score as number,
      durationMs: Math.round(durationMs as number),
      completed: true,
      displayName: (name as { ok: true; value: string }).value,
    },
  };
}

/**
 * A short, non-reversible digest of a submission, safe to log for diagnosis.
 * It never contains the display name in clear text.
 */
export async function scoreDigest(value: ScoreSubmission): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256")
    .update(`${value.game}:${value.score}:${value.durationMs}:${value.displayName}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * In-process rate limiter for score submissions.
 *
 * Serverless instances do not share memory, so this bounds one warm instance
 * rather than the whole platform. It is a cheap first line against a script
 * hammering the endpoint, not a complete solution; the endpoint itself is also
 * disabled from persisting until a server-issued session exists.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

export function allowRequest(key: string, now: number = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  // Bound memory: drop keys that have aged out entirely.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return true;
}
