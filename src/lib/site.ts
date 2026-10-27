// The canonical public origin for the site.
//
// Intentionally a constant rather than an environment lookup: a stale or
// preview-scoped NEXT_PUBLIC_SITE_URL in the hosting environment redirected
// canonical URLs and indexing to a deployment alias, which de-indexed the real
// domain. Canonicalisation must not depend on per-environment configuration.
export const canonicalHost = "www.refifoundation.com";

export const siteUrl = `https://${canonicalHost}`;

// Hosts allowed to be indexed. Everything else (Vercel deployment aliases,
// preview URLs, localhost) is marked noindex by src/middleware.ts.
export const indexableHosts = new Set([canonicalHost, "refifoundation.com"]);
