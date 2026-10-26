// Configuration for the Git-free CMS backend.
//
// The CMS uses Supabase's REST API directly (no client library), so the project
// gains no new dependency. Everything here is server-only: the service-role key
// must never be exposed to the browser.

/** The public read key. Safe to expose; row-level security limits what it can see. */
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

/**
 * The write key. Bypasses row-level security, so it is used only in server route
 * handlers after the caller has been verified against the admin allow-list.
 */
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** The Supabase project URL, without a trailing slash. */
export const supabaseUrl = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");

/**
 * True when the public read path is configured. When false the site reads the
 * JSON snapshot committed under `content/`, which keeps local development and
 * any unconfigured deployment working exactly as before.
 */
export const isContentBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** True when the write path is configured. Required for the dashboard to work. */
export const isWriteBackendConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

/** The deploy hook that rebuilds the public site after a publish. */
export const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL ?? "";

/** Shared secret that guards the keep-alive cron endpoint. */
export const cronSecret = process.env.CRON_SECRET ?? "";

export const contentCollections = [
  "home",
  "stories",
  "projects",
  "events",
  "impact_metrics",
  "pages",
] as const;

export type ContentCollection = (typeof contentCollections)[number];
