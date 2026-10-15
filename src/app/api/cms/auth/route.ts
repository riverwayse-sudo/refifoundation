import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || "https://refifoundation.com";
const cookieName = "refi_cms_oauth_state";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return new NextResponse("CMS authentication is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET as server-only environment variables.", { status: 503 });
  }
  const state = randomUUID();
  const redirectUri = new URL("/api/cms/callback", siteOrigin).toString();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "public_repo");
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set(cookieName, state, {
    httpOnly: true, secure: siteOrigin.startsWith("https://"), sameSite: "lax",
    path: "/api/cms", maxAge: 600,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
