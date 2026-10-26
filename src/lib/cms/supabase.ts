// Minimal Supabase REST (PostgREST) client built on fetch.
//
// Deliberately does not use @supabase/supabase-js: the project's zero-cost rule
// discourages new dependencies, and the handful of calls needed here are simple
// HTTP requests. This keeps the dependency list unchanged.

import { supabaseUrl, supabaseServiceRoleKey } from "./config";

export type ContentRow = {
  id: string;
  collection: string;
  slug: string;
  data: Record<string, unknown>;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

export type SupabaseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

function headers(key: string, extra?: Record<string, string>) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Performs a PostgREST request. Never throws: callers receive a result object so
 * that a paused or unreachable project degrades gracefully instead of crashing
 * a page render or a build.
 */
export async function restRequest<T>(
  path: string,
  init: {
    key: string;
    method?: string;
    body?: unknown;
    prefer?: string;
    signal?: AbortSignal;
    /**
     * Fetch cache mode. Public build-time reads use "force-cache" so the result is
     * baked into the static output and the route stays statically rendered; that is
     * what keeps a paused database from affecting the live site. Write paths use
     * "no-store".
     */
    cacheMode?: RequestCache;
    /** Milliseconds before the request is abandoned. Defaults to 10s. */
    timeoutMs?: number;
  },
): Promise<SupabaseResult<T>> {
  if (!supabaseUrl) {
    return { ok: false, error: "SUPABASE_URL is not configured", status: 0 };
  }

  const url = `${supabaseUrl}/rest/v1/${path.replace(/^\/+/, "")}`;

  // Without a timeout an unreachable project (paused, DNS failure, or a dropped
  // route) can hang a build for a long time. AbortSignal.timeout fails fast so the
  // snapshot fallback engages promptly.
  const timeoutMs = init.timeoutMs ?? 10_000;
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);

  try {
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: headers(init.key, init.prefer ? { Prefer: init.prefer } : undefined),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: init.cacheMode ?? "no-store",
      signal,
    });

    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      const message =
        parsed && typeof parsed === "object" && "message" in parsed
          ? String((parsed as { message: unknown }).message)
          : `request failed with status ${response.status}`;
      return { ok: false, error: message, status: response.status };
    }

    return { ok: true, data: parsed as T };
  } catch (error) {
    // Network failure, DNS failure, or a paused project: all surface here.
    return {
      ok: false,
      error: error instanceof Error ? error.message : "network request failed",
      status: 0,
    };
  }
}

/** Reads visible content rows using the public anon key (row-level security applies). */
export function readVisibleContent(
  collection: string,
  anonKey: string,
  signal?: AbortSignal,
): Promise<SupabaseResult<ContentRow[]>> {
  const query = `content?collection=eq.${encodeURIComponent(collection)}&select=*`;
  // force-cache keeps this read out of the runtime path so the route stays static.
  return restRequest<ContentRow[]>(query, { key: anonKey, signal, cacheMode: "force-cache" });
}

/** Service-role request used only by server routes that have already authorised the caller. */
export function serviceRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<SupabaseResult<T>> {
  if (!supabaseServiceRoleKey) {
    return Promise.resolve({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured", status: 0 });
  }
  return restRequest<T>(path, { ...init, key: supabaseServiceRoleKey });
}
