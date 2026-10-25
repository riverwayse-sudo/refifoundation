import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalHost } from "@/lib/site";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Keep the Vercel deployment aliases and preview URLs out of search indexes;
  // only the canonical host should be indexable.
  if (host && host !== canonicalHost) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};
