const fallbackSiteUrl = "https://www.refifoundation.com";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl).replace(/\/+$/, "");

export const canonicalHost = new URL(siteUrl).host;
