/**
 * Server-issued game sessions.
 *
 * A score sent by a browser proves nothing on its own. This module issues a
 * signed session when a round starts and verifies it when the round ends, so the
 * server knows when the round began. The round duration is then measured by the
 * server rather than reported by the client.
 *
 * The token is stateless: a payload plus an HMAC-SHA256 signature over that
 * payload, keyed by `SCORE_SESSION_SECRET`. No database write is needed to start
 * a round, which keeps the free-tier quota for the scores themselves.
 *
 * What this does not do: it cannot prove the player played honestly, and it is
 * not an account system. It bounds the claims a client can make - the game, the
 * start time and the session identity - and makes each stored round unique.
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getGame } from "./catalog";
import type { GameSlug } from "./types";

/** A round must finish inside this window or the session is refused. */
export const SESSION_TTL_MS = 2 * 60 * 60 * 1_000;

/** Payload version, so a future change can refuse old tokens instead of guessing. */
const TOKEN_VERSION = 1;

/** Clock skew allowance when checking the start time. */
const CLOCK_SKEW_MS = 60 * 1_000;

/** Secrets shorter than this are refused rather than accepted as weak protection. */
export const MIN_SECRET_LENGTH = 32;

export type SessionPayload = {
  v: number;
  sid: string;
  game: GameSlug;
  iat: number;
};

export type IssuedSession = {
  sessionId: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
};

export type SessionCheck =
  | { ok: true; sessionId: string; issuedAt: number }
  | { ok: false; error: string };

export function sessionSecret(): string | null {
  const secret = process.env.SCORE_SESSION_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

export function sessionsConfigured(): boolean {
  return sessionSecret() !== null;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Constant-time comparison that also rejects a length mismatch without leaking it. */
function signatureMatches(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Issue a session for one game. Returns `null` when no usable secret is
 * configured, so callers can report that scores are not being recorded rather
 * than issuing a token nothing can verify.
 */
export function issueSession(game: GameSlug, now: number = Date.now()): IssuedSession | null {
  const secret = sessionSecret();
  if (!secret) return null;
  if (!getGame(game)) return null;

  const payload: SessionPayload = { v: TOKEN_VERSION, sid: randomUUID(), game, iat: now };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

  return {
    sessionId: payload.sid,
    token: `${body}.${sign(body, secret)}`,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
}

/**
 * Verify a token for a specific game. The game is checked against the token, so
 * a session started for one game cannot be spent on another.
 */
export function verifySessionToken(token: unknown, game: GameSlug, now: number = Date.now()): SessionCheck {
  const secret = sessionSecret();
  if (!secret) return { ok: false, error: "Server sessions are not configured." };
  if (typeof token !== "string" || token.length === 0 || token.length > 4_096) {
    return { ok: false, error: "A game session token is required." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "The game session token is malformed." };
  const [body, provided] = parts;
  if (!signatureMatches(sign(body, secret), provided)) {
    return { ok: false, error: "The game session token is not valid." };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "The game session token is malformed." };
  }

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "The game session token is malformed." };
  }
  const { v, sid, game: tokenGame, iat } = payload as Record<string, unknown>;

  if (v !== TOKEN_VERSION) return { ok: false, error: "The game session token is not supported." };
  if (typeof sid !== "string" || sid.length < 8) return { ok: false, error: "The game session token is malformed." };
  if (typeof tokenGame !== "string" || tokenGame !== game) {
    return { ok: false, error: "The game session belongs to a different game." };
  }
  if (typeof iat !== "number" || !Number.isFinite(iat)) {
    return { ok: false, error: "The game session token is malformed." };
  }
  if (iat - now > CLOCK_SKEW_MS) return { ok: false, error: "The game session start time is in the future." };
  if (now - iat > SESSION_TTL_MS) return { ok: false, error: "The game session has expired. Start the round again." };

  return { ok: true, sessionId: sid, issuedAt: iat };
}

/**
 * Duration of a round as measured by the server. Never derived from a value the
 * client sent.
 */
export function sessionDurationMs(issuedAt: number, now: number = Date.now()): number {
  return Math.max(0, Math.round(now - issuedAt));
}
