import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/auth";
import { deployHookUrl } from "@/lib/cms/config";
import { serviceRequest } from "@/lib/cms/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  collection: string;
  slug: string;
  data: Record<string, unknown>;
  published: boolean;
  published_at: string | null;
};

/**
 * Triggers the Vercel deploy hook so the static site rebuilds with the new
 * content. This is the "automated deployment hook" half of Option B.
 *
 * A failure here is reported but not treated as fatal: the content is already
 * saved, and the change will appear on the next deploy regardless. Reporting it
 * honestly is better than claiming a publish succeeded when the site has not yet
 * been rebuilt.
 */
async function triggerDeploy(): Promise<{ triggered: boolean; detail: string }> {
  if (!deployHookUrl) {
    return {
      triggered: false,
      detail:
        "Content saved. Automatic rebuild is not configured, so the change will appear after the next deployment.",
    };
  }

  try {
    const response = await fetch(deployHookUrl, { method: "POST", cache: "no-store" });
    if (!response.ok) {
      return {
        triggered: false,
        detail: `Content saved, but the rebuild request was rejected (status ${response.status}).`,
      };
    }
    return { triggered: true, detail: "Content saved. The website is rebuilding now." };
  } catch {
    return {
      triggered: false,
      detail: "Content saved, but the rebuild request could not be sent. It will appear on the next deployment.",
    };
  }
}

/**
 * Publishes a record: marks it published, stamps the time, and requests a rebuild.
 * The record is identified by collection and slug so the dashboard does not need to
 * track database ids.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { collection, slug, publishAt } = (body ?? {}) as {
    collection?: unknown;
    slug?: unknown;
    publishAt?: unknown;
  };

  if (typeof collection !== "string" || typeof slug !== "string" || !collection || !slug) {
    return NextResponse.json({ error: "A content section and web address are required." }, { status: 400 });
  }

  const publishedAt =
    typeof publishAt === "string" && publishAt.trim() && !Number.isNaN(Date.parse(publishAt))
      ? new Date(publishAt).toISOString()
      : new Date().toISOString();

  // Row-level security does not apply to the service-role key, so the collection
  // and slug are bound as filters rather than interpolated into a broader query.
  const filter = `content?collection=eq.${encodeURIComponent(collection)}&slug=eq.${encodeURIComponent(slug)}`;
  const result = await serviceRequest<Row[]>(`${filter}&select=*`, {
    method: "PATCH",
    body: { published: true, published_at: publishedAt, updated_by: admin.id },
    prefer: "return=representation",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  if (result.data.length === 0) {
    return NextResponse.json({ error: "That item no longer exists." }, { status: 404 });
  }

  const deploy = await triggerDeploy();

  return NextResponse.json(
    { ok: true, publishedAt, rebuild: deploy },
    { headers: { "Cache-Control": "no-store" } },
  );
}
