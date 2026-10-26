// Authentication and authorisation for the CMS dashboard.
//
// Uses Supabase's Auth REST API directly (no client library). Sessions are held in
// httpOnly cookies so tokens are never readable from browser JavaScript, and every
// privileged operation re-checks the admin allow-list server-side rather than
// trusting anything the client sends.

import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "./config";
import { serviceRequest } from "./supabase";

const ACCESS_COOKIE = "refi_cms_access";
const REFRESH_COOKIE = "refi_cms_refresh";

// Access tokens are short-lived; the refresh token is what keeps a session alive.
const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export type CmsUser = { id: string; email: string };

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: { id: string; email?: string };
  error?: string;
  error_description?: string;
  msg?: string;
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase authentication is not configured");
  }
  return fetch(`${supabaseUrl}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
}

/**
 * Verifies a user id against the admin allow-list using the service-role key.
 * A signed-in user who is not listed is treated as unauthorised, so possession of
 * valid credentials alone grants nothing.
 */
export async function isCmsAdmin(userId: string): Promise<boolean> {
  if (!supabaseServiceRoleKey) return false;
  const result = await serviceRequest<Array<{ user_id: string }>>(
    `cms_admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id&limit=1`,
  );
  return result.ok && result.data.length > 0;
}

async function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ACCESS_COOKIE, accessToken, { ...common, maxAge: ACCESS_MAX_AGE });
  store.set(REFRESH_COOKIE, refreshToken, { ...common, maxAge: REFRESH_MAX_AGE });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Signs in with email and password. Returns the user on success.
 *
 * The error text is deliberately generic so the endpoint cannot be used to
 * discover which email addresses have accounts.
 */
export async function signIn(email: string, password: string): Promise<
  { ok: true; user: CmsUser } | { ok: false; error: string }
> {
  try {
    const response = await authFetch("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as TokenResponse;

    if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.user) {
      return { ok: false, error: "Those details were not recognised." };
    }

    await setSessionCookies(payload.access_token, payload.refresh_token);
    return {
      ok: true,
      user: { id: payload.user.id, email: payload.user.email ?? email },
    };
  } catch {
    // A network or configuration failure. Reported generically, and deliberately
    // indistinguishable from bad credentials, so the endpoint reveals nothing.
    return { ok: false, error: "Sign-in is temporarily unavailable. Please try again." };
  }
}

/**
 * Returns the current user, refreshing the access token when it has expired.
 * Returns null when there is no usable session.
 */
export async function getSessionUser(): Promise<CmsUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (accessToken) {
    const user = await verifyAccessToken(accessToken);
    if (user) return user;
  }

  if (!refreshToken) return null;

  // Access token expired: exchange the refresh token for a new pair.
  try {
    const response = await authFetch("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const payload = (await response.json()) as TokenResponse;
    if (!response.ok || !payload.access_token || !payload.refresh_token || !payload.user) {
      await clearSessionCookies();
      return null;
    }
    await setSessionCookies(payload.access_token, payload.refresh_token);
    return { id: payload.user.id, email: payload.user.email ?? "" };
  } catch {
    return null;
  }
}

async function verifyAccessToken(accessToken: string): Promise<CmsUser | null> {
  try {
    const response = await authFetch("user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { id?: string; email?: string };
    if (!payload.id) return null;
    return { id: payload.id, email: payload.email ?? "" };
  } catch {
    return null;
  }
}

/** Returns the signed-in user only when they are also a listed administrator. */
export async function requireAdmin(): Promise<CmsUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return (await isCmsAdmin(user.id)) ? user : null;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken && supabaseUrl && supabaseAnonKey) {
    // Best effort: clear the session server-side, but always clear local cookies.
    try {
      await authFetch("logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      /* ignore */
    }
  }
  await clearSessionCookies();
}

/**
 * Sends a password-reset email. Always reports success so the endpoint cannot be
 * used to test whether an address has an account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await authFetch("recover", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch {
    /* deliberately swallowed */
  }
}
