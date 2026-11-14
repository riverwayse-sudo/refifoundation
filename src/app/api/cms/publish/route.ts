import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/auth";
import { serviceRequest } from "@/lib/cms/supabase";
import { readJsonBody } from "@/lib/cms/request-body";
import { revalidateCmsContent } from "@/lib/cms/revalidation";

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
 * Publishes a record and invalidates the CMS data and route caches. The next
 * visitor request refreshes affected pages through ISR; no full-site deployment
 * is created. The record is identified by collection and slug.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const parsed = await readJsonBody(request, 4 * 1024);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status, headers: { "Cache-Control": "no-store" } });
  }
  const body = parsed.value;

  const { collection, slug, publishAt } = (body ?? {}) as {
    collection?: unknown;
    slug?: unknown;
    publishAt?: unknown;
  };

  const allowedCollections = ["home", "stories", "projects", "events", "impact_metrics", "pages"];
  if (
    typeof collection !== "string" ||
    !allowedCollections.includes(collection) ||
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 80
  ) {
    return NextResponse.json({ error: "A valid content section and web address are required." }, { status: 400 });
  }

  if (publishAt !== undefined && publishAt !== null && publishAt !== "" &&
      (typeof publishAt !== "string" || Number.isNaN(Date.parse(publishAt)))) {
    return NextResponse.json({ error: "The publish date is invalid." }, { status: 400 });
  }

  const publishedAt =
    typeof publishAt === "string" && publishAt.trim()
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

  // Invalidate both the tagged Supabase data and the route cache. The next request
  // regenerates affected pages without a full deployment. Revalidating the root
  // layout covers homepage, stories, projects, events and custom CMS pages.
  revalidateCmsContent();

  const isScheduled = Date.parse(publishedAt) > Date.now();
  const refresh = {
    triggered: true,
    detail: isScheduled
      ? "Content scheduled. It will appear after its publish time on the next hourly refresh."
      : "Content published. Cached pages will refresh on the next request.",
  };

  return NextResponse.json(
    { ok: true, publishedAt, refresh },
    { headers: { "Cache-Control": "no-store" } },
  );
}
