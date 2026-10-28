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
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  if (!allowRequest(`score:${ip}`)) {
    return NextResponse.json(
      { ok: false, accepted: false, error: "Too many submissions. Please wait a minute and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_SCORE_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, accepted: false, error: "The submission is too large." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
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
