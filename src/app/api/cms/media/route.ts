import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/cms/auth";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/cms/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, comfortably inside the free storage tier.

// Deliberately excludes image/svg+xml. SVG can carry embedded scripts, and files in
// this bucket are served from the site's own origin, so allowing SVG would turn an
// image upload into a stored cross-site-scripting vector. Raster formats only.
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^[.-]+/, "");
  return cleaned.slice(0, 80) || "upload";
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: "Media storage is not configured." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was provided." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Images must be PNG, JPEG, WebP, AVIF or GIF." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Images must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  // Timestamped path so an upload never silently replaces an existing file.
  const path = `${Date.now()}-${safeName(file.name).replace(/\.[^.]+$/, "")}.${extension}`;

  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/media/${path}`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Upload failed: ${detail.slice(0, 200)}` },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }

  // The bucket is public, so the object is directly addressable.
  return NextResponse.json(
    { url: `${supabaseUrl}/storage/v1/object/public/media/${path}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
