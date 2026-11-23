import "server-only";

// Loads content for the public site.
//
// Option A: public pages use Next.js ISR. Supabase reads are cached for one hour
// and tagged; an authorised publish invalidates the tag and route cache so the
// next request regenerates the affected pages without a full website deployment.
// The live site serves cached HTML between refreshes, not a database request per visitor.
//
// Resilience: if Supabase is unreachable during a build or an ISR refresh, the
// loader falls back to the JSON snapshot committed under `content/` rather than
// failing a page request. The same snapshot powers local development and an
// unconfigured deployment.

import homeSnapshot from "../../../content/home.json";
import storySnapshot from "../../../content/stories.json";
import projectSnapshot from "../../../content/projects.json";
import eventSnapshot from "../../../content/events.json";
import metricSnapshot from "../../../content/impact-metrics.json";
import pageSnapshot from "../../../content/pages.json";

import { isContentBackendConfigured, supabaseAnonKey } from "./config";
import { readVisibleContent } from "./supabase";
import { rowsToContentRecords } from "./rows";

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
 * Fetches a collection from Supabase, falling back to the committed snapshot.
 *
 * The fallback is deliberate rather than a silent failure: it keeps pages
 * renderable when the free-tier project is paused or the network is unavailable.
 * A warning is emitted so the condition is visible in server/build logs.
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
  return rowsToContentRecords(result.data);
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
