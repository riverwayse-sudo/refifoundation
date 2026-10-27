import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getPublishedStories } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteUrl;
  const stories = await getPublishedStories();

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/our-work`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/impact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/stories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/get-involved`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/play`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/fundraise`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${baseUrl}/donate`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    // getPublishedStories() already excludes scheduled and unpublished stories,
    // so those never reach the sitemap.
    ...stories.map((story) => ({
      url: `${baseUrl}/stories/${story.slug}`,
      lastModified: story.publishedAt ? new Date(story.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
