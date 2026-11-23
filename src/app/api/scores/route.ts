import { NextResponse } from "next/server";
import {
  allowRequest,
  MAX_ROUND_MS,
  MAX_SCORE_BODY_BYTES,
  MIN_ROUND_MS,
  scoreDigest,
  validateScoreSubmission,
} from "@/lib/games/scores";
import { recordScore } from "@/lib/games/leaderboard";
import { sessionDurationMs, sessionsConfigured, verifySessionToken } from "@/lib/games/session";

export const runtime = "nodejs";

/**
 * Score submission endpoint.
 *
 * A browser-reported score is untrusted. Two checks stand between a submission
 * and a public ranking:
 *
 *  1. The submission must carry the signed session token issued when the round
 *     started. That fixes the game, the session identity and the start time on
 *     the server, so the round duration is measured here, not taken from the
 *     client.
 *  2. The score must be an integer inside the bounds that game declares, and the
 *     round must have lasted a believable time.
 *
 * What it still cannot do: prove the player did not cheat. The session bounds
 * the claim, it does not replay the game. A score is therefore only published
 * when it arrived through this route and the store accepted it.
 */
async function readBoundedBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SCORE_BODY_BYTES) {
    throw new RangeError("body-too-large");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SCORE_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("body-too-large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function POST(request: Request) {
  // The platform appends its trusted proxy address to X-Forwarded-For.
  // Using the rightmost address prevents a caller from rotating spoofed
  // left-hand prefixes to bypass the per-client limiter.
  const forwarded = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const ip = forwarded.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";

  if (!allowRequest(`score:${ip}`)) {
    return NextResponse.json(
      { ok: false, accepted: false, error: "Too many submissions. Please wait a minute and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let raw: string;
  try {
    raw = await readBoundedBody(request);
  } catch (error) {
    const tooLarge = error instanceof RangeError && error.message === "body-too-large";
    return NextResponse.json(
      { ok: false, accepted: false, error: tooLarge ? "The submission is too large." : "A valid UTF-8 JSON body is required." },
      { status: tooLarge ? 413 : 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, accepted: false, error: "A JSON body is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const checked = validateScoreSubmission(payload);
  if (!checked.ok) {
    return NextResponse.json(
      { ok: false, accepted: false, stored: false, errors: checked.errors },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const submission = checked.value;
  const body = payload as Record<string, unknown>;

  if (!sessionsConfigured()) {
    // Without a server session there is no way to know when the round started,
    // so the score is not ranked. Say so, rather than silently dropping it.
    const digest = await scoreDigest(submission);
    console.info(`[scores] session verification unavailable, not stored: game=${submission.game} digest=${digest}`);
    return NextResponse.json(
      {
        ok: true,
        accepted: false,
        stored: false,
        verified: false,
        persistence: false,
        sessionsConfigured: false,
        score: submission.score,
        message:
          "Your score was checked but not stored. Verified game sessions are not enabled on this deployment, so scores stay on your device and no public ranking is affected.",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const session = verifySessionToken(body.sessionToken, submission.game);
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, accepted: false, stored: false, verified: false, sessionsConfigured: true, error: session.error },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Server-measured round duration replaces whatever the browser reported.
  const durationMs = sessionDurationMs(session.issuedAt);
  if (durationMs < MIN_ROUND_MS || durationMs > MAX_ROUND_MS) {
    return NextResponse.json(
      {
        ok: false,
        accepted: false,
        stored: false,
        verified: false,
        sessionsConfigured: true,
        error: "The round duration is not within a believable range.",
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const stored = await recordScore({
    sessionId: session.sessionId,
    game: submission.game,
    score: submission.score,
    durationMs,
    displayName: submission.displayName,
  });

  if (!stored.stored && !stored.duplicate) {
    return NextResponse.json(
      {
        ok: false,
        accepted: true,
        stored: false,
        verified: true,
        persistence: stored.persistence,
        error: stored.error || "The score could not be recorded.",
      },
      { status: stored.persistence ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      stored: stored.stored,
      verified: true,
      persistence: stored.persistence,
      duplicate: stored.duplicate,
      sessionsConfigured: true,
      score: submission.score,
      durationMs,
      message: stored.stored
        ? "Your score is verified and on the leaderboard."
        : "This round was already recorded, so the leaderboard is unchanged.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
