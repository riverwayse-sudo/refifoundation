import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

// script-src allows 'unsafe-inline' because Next.js writes its hydration
// bootstrap as inline scripts into statically prerendered HTML, and a nonce
// cannot reach those responses without abandoning static rendering (verified:
// a middleware-generated nonce never appeared on the prerendered script tags).
// Every other directive stays restrictive. The policy is applied in production
// only, so it cannot break the dev server's HMR runtime.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https://images.pexels.com https://*.supabase.co",
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isProduction ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }] : []),
];

// The content manager at /admin is a first-party page. It needs a slightly wider
// policy than the public site because it talks to the Supabase API and shows
// images hosted in the Supabase storage bucket. It deliberately does NOT need
// 'unsafe-eval' or a CDN allowance: the previous editor was a third-party bundle
// loaded from a CDN, and this one is compiled into the application. Keeping
// 'unsafe-eval' out is the point of replacing it.
//
// Scoped to /admin only; the public site keeps the strict policy above.
const adminContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "manifest-src 'self'",
].join("; ");

const adminHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isProduction ? [{ key: "Content-Security-Policy", value: adminContentSecurityPolicy }] : []),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  async headers() {
    // Order matters: for a given header key the last matching rule wins, and
    // "/:path*" also matches /admin. The admin rule must therefore come last.
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
      { source: "/admin", headers: adminHeaders },
    ];
  },
};

export default nextConfig;
