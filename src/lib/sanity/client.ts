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
