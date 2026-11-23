import { NextResponse } from "next/server";
import { allowRequest, MAX_SCORE_BODY_BYTES, scoreDigest, validateScoreSubmission } from "@/lib/games/scores";

export const runtime = "nodejs";

/**
 * Score submission endpoint.
 *
 * This endpoint validates a submitted score and then declines to store it,
 * because there is no authoritative way to confirm that a browser actually
 * played the game. Accepting it into a public ranking would mean publishing a
 * number a client can type by hand.
 *
 * It exists now so the validation rules, the request limits and the response
 * shape are defined and tested before any storage is added. When a
 * server-issued game session exists, storage can be enabled here without
 * changing the contract callers depend on.
 *
 * What it enforces today:
 *  - the body is bounded in size
 *  - the game must be one we publish
 *  - the score must be an integer inside that game's declared bounds
 *  - the round duration must be believable and the round marked complete
 *  - the display name is sanitised and cannot contain an email or a link
 *  - submissions are rate limited per client
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
      { ok: false, accepted: false, errors: checked.errors },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  // The submission is well formed, but a well-formed score is still not proof
  // that a round was played. Report that plainly instead of ranking it.
  const digest = await scoreDigest(checked.value);
  console.info(`[scores] validated submission, not stored: game=${checked.value.game} digest=${digest}`);

  return NextResponse.json(
    {
      ok: true,
      accepted: false,
      stored: false,
      score: checked.value.score,
      message:
        "Your score was validated but not stored. Scores are kept on your device until server-verified game sessions are available, so no public ranking is affected.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
