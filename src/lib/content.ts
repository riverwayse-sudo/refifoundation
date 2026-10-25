import homeData from "../../content/home.json";
import storyData from "../../content/stories.json";
import projectData from "../../content/projects.json";
import eventData from "../../content/events.json";
import metricData from "../../content/impact-metrics.json";
import pageData from "../../content/pages.json";

// Content is authored in the Git-based CMS (Decap) under public/admin, which
// commits JSON into content/ and triggers a Vercel rebuild. These loaders read
// that JSON at build time, so the site stays fully static and needs no runtime
// content service or credentials.

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
const isPast = (value?: string): boolean => Boolean(value) && Date.parse(value as string) <= Date.now();

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
  return records(storyData, "stories")
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
    .filter((item) => item.title && item.slug && isPast(item.publishedAt))
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
  const item = records(pageData, "pages").find(
    (page) => text(page.slug) === slug && page.published === true && !isFuture(page.publishedAt),
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

const isFuture = (value: unknown): boolean => {
  const publishedAt = optionalText(value);
  return Boolean(publishedAt) && Date.parse(publishedAt as string) > Date.now();
};

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
  return records(projectData, "projects")
    .map((item, index) => ({
      id: id("project", item.slug, index),
      title: text(item.title),
      slug: text(item.slug),
      summary: text(item.summary),
      focusArea: optionalText(item.focusArea),
      status: optionalText(item.status),
      coverImageUrl: optionalText(item.coverImageUrl),
    }))
    .filter((item) => item.title && item.slug)
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
  return records(eventData, "events")
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
    .filter(
      (item) =>
        item.title &&
        item.slug &&
        item.startsAt &&
        Date.parse(item.startsAt) >= Date.now() &&
        item.status === "Published",
    )
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
  return records(metricData, "metrics")
    .map((item, index) => ({
      id: id("metric", item.label, index),
      label: text(item.label),
      value: text(item.value),
      context: optionalText(item.context),
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
      verified: item.verified === true,
    }))
    // Only figures explicitly marked verified may be published.
    .filter((item) => item.label && item.value && item.verified)
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
  return homeData as HomeSettings;
}
