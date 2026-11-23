import { NextResponse } from "next/server";
import { getGame, GAME_SLUGS } from "@/lib/games/catalog";
import type { GameSlug } from "@/lib/games/types";
import { allowRequest } from "@/lib/games/scores";
import { issueSession, sessionsConfigured } from "@/lib/games/session";

export const runtime = "nodejs";

/**
 * Starts a game round on the server.
 *
 * The round's start time is stamped here, not in the browser, so the duration
 * submitted with the score can be checked rather than trusted. The route is rate
 * limited per client and issues one token per request; the token is signed, so
 * the server can later confirm it created the session.
 */
export async function POST(request: Request) {
  const forwarded = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const ip = forwarded.at(-1) || request.headers.get("x-real-ip")?.trim() || "unknown";

  if (!allowRequest(`session:${ip}`)) {
    return NextResponse.json(
      { configured: sessionsConfigured(), error: "Too many rounds started. Please wait a minute and try again." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: { game?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { configured: sessionsConfigured(), error: "A JSON body is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const game = body.game;
  if (typeof game !== "string" || !(GAME_SLUGS as string[]).includes(game) || !getGame(game as GameSlug)) {
    return NextResponse.json(
      { configured: sessionsConfigured(), error: "Unknown game identifier." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const session = issueSession(game as GameSlug);
  if (!session) {
    return NextResponse.json(
      {
        configured: false,
        error: "Verified game sessions are not enabled on this deployment, so scores are kept on your device only.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      configured: true,
      sessionId: session.sessionId,
      token: session.token,
      issuedAt: new Date(session.issuedAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
