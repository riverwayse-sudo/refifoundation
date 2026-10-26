// Loads content for the public site.
//
// Option B: the public site is statically generated, so content is read at BUILD
// time. Publishing writes to Supabase and then triggers a deploy hook, which
// rebuilds. The live site therefore never queries the database at runtime, and a
// paused or unreachable Supabase project cannot affect visitors.
//
// Build-time resilience: if Supabase is unreachable during a build, the loader
// falls back to the JSON snapshot committed under `content/` rather than failing
// the build. That snapshot is written by `npm run cms:snapshot` and is also what
// a deployment with no backend configured uses, so local development and the
// current static behaviour are unchanged.

import homeSnapshot from "../../../content/home.json";
import storySnapshot from "../../../content/stories.json";
import projectSnapshot from "../../../content/projects.json";
import eventSnapshot from "../../../content/events.json";
import metricSnapshot from "../../../content/impact-metrics.json";
import pageSnapshot from "../../../content/pages.json";

import { isContentBackendConfigured, supabaseAnonKey } from "./config";
import { readVisibleContent } from "./supabase";

export type ContentSource = {
  home: Record<string, unknown>;
  stories: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  events: Record<string, unknown>[];
  metrics: Record<string, unknown>[];
  pages: Record<string, unknown>[];
};

function snapshot(): ContentSource {
  const list = (value: unknown, key: string): Record<string, unknown>[] => {
    if (!value || typeof value !== "object") return [];
    const items = (value as Record<string, unknown>)[key];
    return Array.isArray(items)
      ? items.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      : [];
  };

  return {
    home: (homeSnapshot ?? {}) as Record<string, unknown>,
    stories: list(storySnapshot, "stories"),
    projects: list(projectSnapshot, "projects"),
    events: list(eventSnapshot, "events"),
    metrics: list(metricSnapshot, "metrics"),
    pages: list(pageSnapshot, "pages"),
  };
}

/**
 * Rebuilds the JSON shape the templates expect from database rows.
 *
 * `published` and `publishedAt` are folded back into the record so the existing
 * visibility filters in content.ts keep working unchanged against either source.
 */
function fromRows(rows: Array<{ slug: string; data: unknown; published: boolean; published_at: string | null }>): Record<string, unknown>[] {
  return rows
    .filter((row) => row.data && typeof row.data === "object")
    .map((row) => ({
      ...(row.data as Record<string, unknown>),
      published: row.published,
      publishedAt: (row.data as Record<string, unknown>).publishedAt ?? row.published_at ?? undefined,
    }));
}

/**
 * Fetches a collection from Supabase, falling back to the committed snapshot.
 *
 * The fallback is deliberate rather than a silent failure: it keeps the site
 * buildable when the free-tier project is paused or the network is unavailable,
 * which is the main reliability risk of a zero-cost backend. A warning is emitted
 * so the condition is visible in build logs.
 */
async function loadCollection(
  collection: string,
  fallback: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (!isContentBackendConfigured) return fallback;

  const result = await readVisibleContent(collection, supabaseAnonKey);
  if (!result.ok) {
    console.warn(
      `[cms] falling back to the committed ${collection} snapshot: ${result.error}`,
    );
    return fallback;
  }

  // An empty table is a valid state (the site starts with no stories), so an
  // empty result is returned as-is rather than treated as a failure.
  return fromRows(result.data);
}

export async function loadContentSource(): Promise<ContentSource> {
  const base = snapshot();

  if (!isContentBackendConfigured) return base;

  const [stories, projects, events, metrics, pages, homeRows] = await Promise.all([
    loadCollection("stories", base.stories),
    loadCollection("projects", base.projects),
    loadCollection("events", base.events),
    loadCollection("impact_metrics", base.metrics),
    loadCollection("pages", base.pages),
    loadCollection("home", []),
  ]);

  return {
    // Home is a singleton. If the table has no home row yet, keep the snapshot so
    // the homepage never renders empty.
    home: homeRows[0] ?? base.home,
    stories,
    projects,
    events,
    metrics,
    pages,
  };
}
