import { loadContentSource } from "./cms/content-source";
import {
  isPublishedStory,
  isVisiblePage,
  isPublishedEvent,
  isVerifiedMetric,
  isPublishedProject,
} from "./cms/visibility";

// Content is authored in the CMS dashboard at /admin and stored in Supabase.
// Public pages use ISR with a one-hour data-cache window. Publishing invalidates
// the shared CMS tag and route cache, so the next request refreshes content without
// rebuilding or redeploying the website.
//
// When no backend is configured, or Supabase is unavailable, loaders use the
// committed JSON snapshot under content/. Both paths produce the same shape.

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const optionalText = (value: unknown): string | undefined => text(value).trim() || undefined;

export type PublishedStory = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  /** Raw Markdown, rendered by react-markdown. */
  body: string;
};

export async function getPublishedStories(): Promise<PublishedStory[]> {
  const source = await loadContentSource();
  return source.stories
    .map((item) => ({
      id: text(item.slug),
      title: text(item.title),
      slug: text(item.slug),
      excerpt: optionalText(item.excerpt),
      category: optionalText(item.category),
      coverImageUrl: optionalText(item.coverImageUrl),
      publishedAt: optionalText(item.publishedAt),
      body: text(item.body),
    }))
    // Scheduled stories stay hidden until their publish time.
    .filter((item) => isPublishedStory(item))
    .sort((a, b) => Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? ""));
}

export async function getPublishedStory(slug: string): Promise<PublishedStory | null> {
  return (await getPublishedStories()).find((item) => item.slug === slug) ?? null;
}

export type PublishedPage = {
  title: string;
  slug: string;
  summary?: string;
  heroImageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Raw Markdown, rendered by react-markdown. */
  body: string;
};

export async function getPublishedPage(slug: string): Promise<PublishedPage | null> {
  const source = await loadContentSource();
  const item = source.pages.find(
    (page) => text(page.slug) === slug && isVisiblePage(page),
  );
  if (!item) return null;
  return {
    title: text(item.title),
    slug,
    summary: optionalText(item.summary),
    heroImageUrl: optionalText(item.heroImageUrl),
    seoTitle: optionalText(item.seoTitle),
    seoDescription: optionalText(item.seoDescription),
    body: text(item.body),
  };
}

/** Returns every page eligible for static generation and sitemap inclusion. */
export async function getPublishedPages(): Promise<PublishedPage[]> {
  const source = await loadContentSource();
  return source.pages
    // /our-work is the existing public route; do not emit a duplicate /pages/our-work URL.
    .filter((item) => text(item.slug) !== "our-work" && isVisiblePage(item))
    .map((item) => ({
      title: text(item.title),
      slug: text(item.slug),
      summary: optionalText(item.summary),
      heroImageUrl: optionalText(item.heroImageUrl),
      seoTitle: optionalText(item.seoTitle),
      seoDescription: optionalText(item.seoDescription),
      body: text(item.body),
    }));
}

export type PublishedProject = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  focusArea?: string;
  status?: string;
  coverImageUrl?: string;
};

export async function getPublishedProjects(): Promise<PublishedProject[]> {
  const source = await loadContentSource();
  return source.projects
    .map((item) => ({
      id: text(item.slug),
      title: text(item.title),
      slug: text(item.slug),
      summary: text(item.summary),
      focusArea: optionalText(item.focusArea),
      status: optionalText(item.status),
      coverImageUrl: optionalText(item.coverImageUrl),
    }))
    .filter((item) => isPublishedProject(item))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export type PublishedEvent = {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  summary?: string;
  registrationUrl?: string;
  coverImageUrl?: string;
};

export async function getPublishedEvents(): Promise<PublishedEvent[]> {
  const source = await loadContentSource();
  return source.events
    .map((item) => ({
      id: text(item.slug),
      title: text(item.title),
      slug: text(item.slug),
      startsAt: text(item.startsAt),
      endsAt: optionalText(item.endsAt),
      location: optionalText(item.location),
      summary: optionalText(item.summary),
      registrationUrl: optionalText(item.registrationUrl),
      coverImageUrl: optionalText(item.coverImageUrl),
      status: text(item.status),
    }))
    .filter((item) => Boolean(item.slug) && isPublishedEvent(item))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export type VerifiedImpactMetric = {
  id: string;
  label: string;
  value: string;
  context?: string;
  sortOrder: number;
};

export async function getVerifiedImpactMetrics(): Promise<VerifiedImpactMetric[]> {
  const source = await loadContentSource();
  return source.metrics
    .map((item) => ({
      id: text(item.label),
      label: text(item.label),
      value: text(item.value),
      context: optionalText(item.context),
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      verified: item.verified === true,
    }))
    // Only figures explicitly marked verified may be published.
    .filter((item) => isVerifiedMetric(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export type HomeSettings = {
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  introHeading?: string;
  introBody?: string;
  heroImageUrl?: string;
};

export async function getHomeSettings(): Promise<HomeSettings | null> {
  const source = await loadContentSource();
  return source.home as HomeSettings;
}
