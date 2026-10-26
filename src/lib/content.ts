import { loadContentSource } from "./cms/content-source";
import {
  isPublishedStory,
  isVisiblePage,
  isPublishedEvent,
  isVerifiedMetric,
  isPublishedProject,
} from "./cms/visibility";

// Content is authored in the CMS dashboard at /admin, which writes to Supabase and
// then triggers a deploy hook. The public site is statically generated, so these
// loaders read at build time and the templates stay unchanged.
//
// When no backend is configured (local development, or a deployment without
// Supabase), the loaders read the JSON snapshot under content/. Both paths produce
// the same shape, so the filtering rules below apply identically either way.

type ContentRecord = Record<string, unknown>;

const records = (value: unknown, key: string): ContentRecord[] => {
  if (!value || typeof value !== "object") return [];
  const list = (value as Record<string, unknown>)[key];
  return Array.isArray(list)
    ? list.filter((item): item is ContentRecord => Boolean(item && typeof item === "object"))
    : [];
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const optionalText = (value: unknown): string | undefined => text(value).trim() || undefined;
const id = (prefix: string, value: unknown, index: number) => text(value) || `${prefix}-${index + 1}`;

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
  return records({ stories: source.stories }, "stories")
    .map((item, index) => ({
      id: id("story", item.slug, index),
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
  const item = records({ pages: source.pages }, "pages").find(
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
  return records({ projects: source.projects }, "projects")
    .map((item, index) => ({
      id: id("project", item.slug, index),
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
  return records({ events: source.events }, "events")
    .map((item, index) => ({
      id: id("event", item.slug, index),
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
  return records({ metrics: source.metrics }, "metrics")
    .map((item, index) => ({
      id: id("metric", item.label, index),
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
