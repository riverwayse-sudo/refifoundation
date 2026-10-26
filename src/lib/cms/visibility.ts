// The rules that decide what the public may see.
//
// Kept free of imports and I/O so the rules can be unit tested directly and so
// there is exactly one place in the TypeScript codebase that encodes them. The
// database enforces the same rules in public.is_content_visible() (see
// supabase/migrations/0001_cms_schema.sql), which is the authority for anything
// read through the anon key. These functions guard the build-time read path.

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
 * A story with no date is not public. This matches the behaviour of the previous
 * loader, whose isPast() helper returned false for an absent date, so moving to the
 * CMS does not change what appears on the site.
 */
export function isPublishedStory(item: ContentRecord, now: number = Date.now()): boolean {
  return Boolean(text(item.title)) && Boolean(text(item.slug)) && isDue(item.publishedAt, now);
}

/** A page is public when marked published and not scheduled for the future. */
export function isVisiblePage(item: ContentRecord, now: number = Date.now()): boolean {
  if (item.published !== true) return false;
  return !isScheduled(item.publishedAt, now);
}

/**
 * An event is public when it is marked Published and has not yet started.
 * Past events drop off automatically, and a Draft or Cancelled event stays hidden
 * regardless of its date.
 */
export function isPublishedEvent(item: ContentRecord, now: number = Date.now()): boolean {
  if (text(item.status) !== "Published") return false;
  const startsAt = text(item.startsAt);
  if (!startsAt) return false;
  const parsed = Date.parse(startsAt);
  return !Number.isNaN(parsed) && parsed >= now;
}

/**
 * An impact figure is public only when explicitly verified. Unverified figures must
 * never appear, since they may be unconfirmed claims about the Foundation's work.
 */
export function isVerifiedMetric(item: ContentRecord): boolean {
  return item.verified === true && Boolean(text(item.label)) && Boolean(text(item.value));
}

/** Projects are public when they have a title and a slug. */
export function isPublishedProject(item: ContentRecord): boolean {
  return Boolean(text(item.title)) && Boolean(text(item.slug));
}
