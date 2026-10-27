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
  "img-src 'self' data: https://images.pexels.com",
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

// The CMS admin at /admin loads Decap from a CDN and talks to the GitHub API
// directly from the browser, so it needs a wider policy than the public site.
// It is scoped to /admin only; everything else keeps the strict policy.
//
// 'unsafe-eval' is required because Decap's config loader evaluates the YAML
// through a JavaScript string (verified: without it the admin fails with
// "Evaluating a string as JavaScript violates ... script-src"). This weakens
// script protection on that route, which is why it is confined to /admin, which
// is noindex and requires a GitHub OAuth session. It is not applied anywhere on
// the public site.
const adminContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://raw.githubusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com",
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
  async rewrites() {
    // The CMS admin is a static file at public/admin/index.html. Next strips the
    // trailing slash, so "/admin" would 404. Decap also resolves config.yml
    // relative to the document URL, so the trailing-slash form must be preserved
    // (serving "/admin" would make it look for "/config.yml").
    return [
      { source: "/admin/", destination: "/admin/index.html" },
      { source: "/admin", destination: "/admin/index.html" },
    ];
  },
};

export default nextConfig;
