import { createClient } from "next-sanity";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

export const sanityConfigured = Boolean(projectId && dataset);

export const sanityClient = sanityConfigured
  ? createClient({
      projectId: projectId!,
      dataset: dataset!,
      apiVersion: "2026-10-01",
      useCdn: true,
    })
  : null;

export type PublishedStory = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  body?: unknown[];
};

const storiesQuery = `*[_type == "story" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc) {
  _id, title, "slug": slug.current, excerpt, category, publishedAt,
  "coverImageUrl": coverImage.asset->url,
  body
}`;

export async function getPublishedStories(): Promise<PublishedStory[]> {
  if (!sanityClient) return [];
  try {
    return await sanityClient.fetch<PublishedStory[]>(storiesQuery, {}, { next: { revalidate: 60 } });
  } catch {
    return [];
  }
}

export async function getPublishedStory(slug: string): Promise<PublishedStory | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch<PublishedStory | null>(
      `*[_type == "story" && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0] {
        _id, title, "slug": slug.current, excerpt, category, publishedAt,
        "coverImageUrl": coverImage.asset->url,
        body
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
  } catch {
    return null;
  }
}

export type PublishedProject = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  focusArea?: string;
  status?: string;
  coverImageUrl?: string;
};

export type PublishedEvent = {
  _id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  summary?: string;
  registrationUrl?: string;
  coverImageUrl?: string;
};

export type VerifiedImpactMetric = {
  _id: string;
  label: string;
  value: string;
  context?: string;
  sortOrder?: number;
};

export async function getPublishedProjects(): Promise<PublishedProject[]> {
  if (!sanityClient) return [];
  try {
    return await sanityClient.fetch<PublishedProject[]>(
      `*[_type == "project" && defined(slug.current)] | order(isFeatured desc, title asc) {
        _id, title, "slug": slug.current, summary, focusArea, status,
        "coverImageUrl": coverImage.asset->url
      }`,
      {},
      { next: { revalidate: 60 } },
    );
  } catch {
    return [];
  }
}

export async function getPublishedEvents(): Promise<PublishedEvent[]> {
  if (!sanityClient) return [];
  try {
    return await sanityClient.fetch<PublishedEvent[]>(
      `*[_type == "event" && status == "Published" && startsAt >= now()] | order(startsAt asc) {
        _id, title, "slug": slug.current, startsAt, endsAt, location, summary, registrationUrl,
        "coverImageUrl": coverImage.asset->url
      }`,
      {},
      { next: { revalidate: 60 } },
    );
  } catch {
    return [];
  }
}

export async function getVerifiedImpactMetrics(): Promise<VerifiedImpactMetric[]> {
  if (!sanityClient) return [];
  try {
    return await sanityClient.fetch<VerifiedImpactMetric[]>(
      `*[_type == "impactMetric" && verified == true] | order(sortOrder asc) {
        _id, label, value, context, sortOrder
      }`,
      {},
      { next: { revalidate: 60 } },
    );
  } catch {
    return [];
  }
}
