import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const stateCookieName = "refi_cms_oauth_state";

// Decap opens the OAuth flow in a popup and waits for a postMessage from this
// page, so the callback must return a small HTML document rather than JSON.
function popupResponse(message: string, status = 200) {
  const safeMessage = JSON.stringify(message).replace(/</g, "\\u003c");
  const safeOrigin = JSON.stringify(siteUrl);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>REFI CMS authentication</title></head><body><p>Completing sign-in…</p><script>if (window.opener) { window.opener.postMessage(${safeMessage}, ${safeOrigin}); } window.close();</script></body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get(stateCookieName)?.value;

  if (searchParams.get("error")) {
    return popupResponse(
      "authorization:github:error:" + JSON.stringify({ message: "GitHub sign-in was cancelled or denied." }),
    );
  }

  // Reject the callback unless it carries the state we issued, so a forged
  // request cannot complete a sign-in.
  if (!code || !state || !expectedState || state !== expectedState) {
    return popupResponse(
      "authorization:github:error:" + JSON.stringify({ message: "The sign-in request could not be verified. Please try again." }),
      400,
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return popupResponse(
      "authorization:github:error:" + JSON.stringify({ message: "CMS authentication is not configured." }),
      503,
    );
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL("/api/cms/callback", siteUrl).toString(),
      }),
      cache: "no-store",
    });

    const payload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !payload.access_token) {
      return popupResponse(
        "authorization:github:error:" + JSON.stringify({ message: "GitHub did not authorise the CMS session. Check the OAuth app configuration." }),
        502,
      );
    }

    const response = popupResponse(
      "authorization:github:success:" + JSON.stringify({ token: payload.access_token, provider: "github" }),
    );
    // Clear the single-use state cookie.
    response.cookies.set(stateCookieName, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/cms",
      maxAge: 0,
    });
    return response;
  } catch {
    return popupResponse(
      "authorization:github:error:" + JSON.stringify({ message: "Unable to complete GitHub sign-in. Please retry." }),
      502,
    );
  }
}
