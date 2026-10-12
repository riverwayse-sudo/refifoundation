import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.refifoundation.com").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/our-work`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/impact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/stories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/get-involved`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/donate`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
