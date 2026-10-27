import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

// OAuth state cookie. Scoped to /api/cms so it is only sent to the callback.
const stateCookieName = "refi_cms_oauth_state";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return new NextResponse(
      "CMS authentication is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET as server-only environment variables in the hosting project.",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const state = randomUUID();
  const redirectUri = new URL("/api/cms/callback", siteUrl).toString();

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  // `public_repo` is the minimum scope that allows committing content back to
  // this public repository. Do not widen this without a specific need.
  authorizeUrl.searchParams.set("scope", "public_repo");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(stateCookieName, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/cms",
    maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
