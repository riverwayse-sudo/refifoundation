// The rules that decide what the public may see.
//
// Kept free of imports and I/O so the rules can be unit tested directly and so
// there is exactly one place in the TypeScript codebase that encodes them. The
// database enforces the same rules in public.is_content_visible() (see
// supabase/migrations/0001_cms_schema.sql), which is the authority for anything
// read through the anon key. These functions also guard the JSON snapshot fallback.
//
// Snapshot files intentionally contain drafts for recovery. A missing "published"
// property is tolerated for legacy Decap JSON records; an explicit false must always
// hide the item. This distinction keeps old snapshots compatible without leaking
// unpublished CMS records when Supabase is unavailable.

export type ContentRecord = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** True when a value parses as a date that is not in the future. */
export function isDue(value: unknown, now: number = Date.now()): boolean {
  const raw = text(value);
  if (!raw) return false;
  const parsed = Date.parse(raw);
  return !Number.isNaN(parsed) && parsed <= now;
}

/** True when a value parses as a date that is in the future. */
export function isScheduled(value: unknown, now: number = Date.now()): boolean {
  const raw = text(value);
  if (!raw) return false;
  const parsed = Date.parse(raw);
  return !Number.isNaN(parsed) && parsed > now;
}

/**
 * A story is public only once its publish date has passed.
 *
 * A story with no date is not public. Explicit unpublished state is honoured for
 * CMS snapshots; missing state remains compatible with legacy JSON content.
 */
export function isPublishedStory(item: ContentRecord, now: number = Date.now()): boolean {
  if (item.published === false) return false;
  return Boolean(text(item.title)) && Boolean(text(item.slug)) && isDue(item.publishedAt, now);
}

/** A page is public when marked published and not scheduled for the future. */
export function isVisiblePage(item: ContentRecord, now: number = Date.now()): boolean {
  if (item.published !== true) return false;
  return !isScheduled(item.publishedAt, now);
}

/**
 * An event is public when it is marked Published and has not yet started.
 * Explicit unpublished state is honoured for CMS snapshots; legacy records without
 * a top-level published property continue to use the status field.
 */
export function isPublishedEvent(item: ContentRecord, now: number = Date.now()): boolean {
  if (item.published === false || text(item.status) !== "Published") return false;
  const startsAt = text(item.startsAt);
  if (!startsAt) return false;
  const parsed = Date.parse(startsAt);
  return !Number.isNaN(parsed) && parsed >= now;
}

/**
 * An impact figure is public only when explicitly verified. Unverified figures must
 * never appear. Explicit unpublished state also hides a verified item in snapshots.
 */
export function isVerifiedMetric(item: ContentRecord): boolean {
  return item.published !== false &&
    item.verified === true &&
    Boolean(text(item.label)) &&
    Boolean(text(item.value));
}

/** Projects are public when published and have a title and a slug. */
export function isPublishedProject(item: ContentRecord): boolean {
  return item.published !== false && Boolean(text(item.title)) && Boolean(text(item.slug));
}
