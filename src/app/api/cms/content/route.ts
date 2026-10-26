import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/auth";
import { contentCollections, type ContentCollection } from "@/lib/cms/config";
import { serviceRequest } from "@/lib/cms/supabase";
import { normaliseSlug, isValidSlug, validateContent } from "@/lib/cms/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  collection: string;
  slug: string;
  data: Record<string, unknown>;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

function isCollection(value: unknown): value is ContentCollection {
  return typeof value === "string" && (contentCollections as readonly string[]).includes(value);
}

const unauthorised = () =>
  NextResponse.json({ error: "Not authorised." }, { status: 401, headers: { "Cache-Control": "no-store" } });

// Lists every record in a collection, including drafts and scheduled items. This
// is the administrative view, so it requires a signed-in administrator and reads
// with the service-role key rather than the row-level-security-filtered anon key.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorised();

  const collection = new URL(request.url).searchParams.get("collection");
  if (!isCollection(collection)) {
    return NextResponse.json({ error: "Unknown content section." }, { status: 400 });
  }

  const result = await serviceRequest<Row[]>(
    `content?collection=eq.${encodeURIComponent(collection)}&select=*&order=updated_at.desc`,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ items: result.data }, { headers: { "Cache-Control": "no-store" } });
}

// Creates or updates a record. Validation runs server-side, so the API cannot be
// used to store a record the dashboard would have rejected.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorised();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { collection, slug, data, published, publishAt } = (body ?? {}) as {
    collection?: unknown;
    slug?: unknown;
    data?: unknown;
    published?: unknown;
    publishAt?: unknown;
  };

  if (!isCollection(collection)) {
    return NextResponse.json({ error: "Unknown content section." }, { status: 400 });
  }

  // `home` is a singleton, so it always uses a fixed slug.
  const rawSlug = collection === "home" ? "home" : normaliseSlug(slug);
  if (!isValidSlug(rawSlug)) {
    return NextResponse.json(
      { error: "A web address is required and may contain only letters, numbers and hyphens." },
      { status: 400 },
    );
  }

  const validated = validateContent(collection, (data ?? {}) as Record<string, unknown>);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.errors.join(" ") }, { status: 400 });
  }

  // Verification is not settable through this route, so an update must carry the
  // existing value forward rather than dropping it. Without this, editing a verified
  // metric would silently unverify it and remove the figure from the public site.
  if (collection === "impact_metrics") {
    const existing = await serviceRequest<Array<{ data: Record<string, unknown> }>>(
      `content?collection=eq.impact_metrics&slug=eq.${encodeURIComponent(rawSlug)}&select=data&limit=1`,
    );
    if (existing.ok && existing.data.length > 0 && existing.data[0].data?.verified === true) {
      validated.value.verified = true;
    }
  }

  // A scheduled publish time is stored on the record; the database visibility rule
  // decides when the item actually becomes public.
  const publishAtIso =
    typeof publishAt === "string" && publishAt.trim() && !Number.isNaN(Date.parse(publishAt))
      ? new Date(publishAt).toISOString()
      : null;

  const payload = {
    collection,
    slug: rawSlug,
    data: validated.value,
    published: published === true,
    published_at: publishAtIso ?? validated.value.publishedAt ?? null,
    updated_by: admin.id,
  };

  const result = await serviceRequest<Row[]>("content?on_conflict=collection,slug&select=*", {
    method: "POST",
    body: payload,
    prefer: "resolution=merge-duplicates,return=representation",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { item: result.data[0] ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
