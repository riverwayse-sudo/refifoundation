import { NextResponse } from "next/server";
import { cronSecret, isContentBackendConfigured, supabaseUrl, supabaseAnonKey } from "@/lib/cms/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Keeps the free-tier Supabase project awake.
 *
 * Free projects pause after seven days without activity, which would leave the
 * dashboard unusable until the project is manually restored. A daily request counts
 * as activity and keeps it running at no cost. Vercel's Hobby plan permits one run
 * per day, which is well inside the seven-day window.
 *
 * This is a mitigation, not a guarantee: if the project is paused by hand, if
 * Supabase changes its policy, or if the cron fails for over a week, the dashboard
 * will need manual restoration. That limitation is documented rather than hidden.
 */
export async function GET(request: Request) {
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically for cron
  // invocations once CRON_SECRET is set, so requiring it costs the scheduled call
  // nothing. The endpoint fails closed: without a configured secret it refuses
  // rather than allowing anyone to generate traffic against the database.
  if (!cronSecret) {
    return NextResponse.json(
      {
        error: "Not authorised.",
        detail: "CRON_SECRET is not configured, so this endpoint is disabled.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  if (!isContentBackendConfigured) {
    return NextResponse.json(
      { ok: false, detail: "No content backend is configured, nothing to keep awake." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/content?select=id&limit=1`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
      cache: "no-store",
    });
    return NextResponse.json(
      {
        ok: response.ok,
        status: response.status,
        tookMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "request failed",
        checkedAt: new Date().toISOString(),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
