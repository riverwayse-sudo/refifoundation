// Validation for CMS content.
//
// Kept as pure functions with no I/O so they can be unit tested directly, and so
// the same rules are enforced in one place rather than duplicated between the
// dashboard and the API.

import type { ContentCollection } from "./config";

export type ValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: string[] };

const MAX_TEXT = 5_000;
const MAX_BODY = 100_000;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Parses a date-ish value to ISO, returning undefined for empty or invalid input. */
export function toIsoOrUndefined(value: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

/**
 * Validates a slug: lowercase letters, numbers and single hyphens. This keeps
 * public URLs predictable and prevents a slug that would break routing.
 */
export function normaliseSlug(value: unknown): string {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
}

const CATEGORIES = ["Education", "Community", "Sport & wellbeing", "News", "Impact"];
const FOCUS_AREAS = ["Education", "Community support", "Sport & wellbeing"];
const PROJECT_STATUSES = ["Planned", "Active", "Completed"];
const EVENT_STATUSES = ["Draft", "Published", "Cancelled"];

function requireText(
  errors: string[],
  data: Record<string, unknown>,
  field: string,
  label: string,
  max = MAX_TEXT,
): void {
  const value = str(data[field]);
  if (!value) {
    errors.push(`${label} is required.`);
  } else if (value.length > max) {
    errors.push(`${label} must be ${max} characters or fewer.`);
  }
}

function optionalText(
  errors: string[],
  data: Record<string, unknown>,
  field: string,
  label: string,
  max = MAX_TEXT,
): void {
  const value = str(data[field]);
  if (value.length > max) {
    errors.push(`${label} must be ${max} characters or fewer.`);
  }
}

function requireEnum(
  errors: string[],
  data: Record<string, unknown>,
  field: string,
  label: string,
  allowed: string[],
): void {
  const value = str(data[field]);
  if (!value) {
    errors.push(`${label} is required.`);
  } else if (!allowed.includes(value)) {
    errors.push(`${label} must be one of: ${allowed.join(", ")}.`);
  }
}

/**
 * Validates and normalises a content record for a collection.
 *
 * Returns a cleaned record rather than the raw input, so unexpected fields cannot
 * be persisted and every stored record has a predictable shape.
 */
export function validateContent(
  collection: ContentCollection,
  input: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];

  switch (collection) {
    case "home": {
      requireText(errors, input, "heroTitle", "Hero title");
      requireText(errors, input, "heroDescription", "Hero description");
      requireText(errors, input, "primaryCtaLabel", "Primary button label");
      requireText(errors, input, "primaryCtaUrl", "Primary button URL");
      optionalText(errors, input, "heroEyebrow", "Hero eyebrow");
      optionalText(errors, input, "secondaryCtaLabel", "Secondary button label");
      optionalText(errors, input, "secondaryCtaUrl", "Secondary button URL");
      optionalText(errors, input, "introHeading", "Introduction heading");
      optionalText(errors, input, "introBody", "Introduction body");
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          heroEyebrow: str(input.heroEyebrow),
          heroTitle: str(input.heroTitle),
          heroDescription: str(input.heroDescription),
          primaryCtaLabel: str(input.primaryCtaLabel),
          primaryCtaUrl: str(input.primaryCtaUrl),
          secondaryCtaLabel: str(input.secondaryCtaLabel),
          secondaryCtaUrl: str(input.secondaryCtaUrl),
          introHeading: str(input.introHeading),
          introBody: str(input.introBody),
          heroImageUrl: str(input.heroImageUrl),
        },
      };
    }

    case "stories": {
      requireText(errors, input, "title", "Headline");
      requireText(errors, input, "excerpt", "Summary");
      requireEnum(errors, input, "category", "Category", CATEGORIES);
      optionalText(errors, input, "body", "Story body", MAX_BODY);
      const publishedAt = toIsoOrUndefined(input.publishedAt);
      if (str(input.publishedAt) && !publishedAt) {
        errors.push("Publish date is not a valid date.");
      }
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          title: str(input.title),
          excerpt: str(input.excerpt),
          category: str(input.category),
          coverImageUrl: str(input.coverImageUrl),
          body: typeof input.body === "string" ? input.body : "",
          publishedAt: publishedAt ?? "",
        },
      };
    }

    case "projects": {
      requireText(errors, input, "title", "Project name");
      requireText(errors, input, "summary", "Summary");
      requireEnum(errors, input, "focusArea", "Focus area", FOCUS_AREAS);
      requireEnum(errors, input, "status", "Status", PROJECT_STATUSES);
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          title: str(input.title),
          summary: str(input.summary),
          focusArea: str(input.focusArea),
          status: str(input.status),
          coverImageUrl: str(input.coverImageUrl),
        },
      };
    }

    case "events": {
      requireText(errors, input, "title", "Event name");
      requireEnum(errors, input, "status", "Status", EVENT_STATUSES);
      const startsAt = toIsoOrUndefined(input.startsAt);
      if (!startsAt) errors.push("Start date and time is required and must be a valid date.");
      const endsAt = toIsoOrUndefined(input.endsAt);
      if (str(input.endsAt) && !endsAt) errors.push("End date and time is not a valid date.");
      if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
        errors.push("End date and time cannot be before the start.");
      }
      optionalText(errors, input, "summary", "Description");
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          title: str(input.title),
          startsAt: startsAt as string,
          endsAt: endsAt ?? "",
          location: str(input.location),
          summary: str(input.summary),
          registrationUrl: str(input.registrationUrl),
          coverImageUrl: str(input.coverImageUrl),
          status: str(input.status),
        },
      };
    }

    case "impact_metrics": {
      requireText(errors, input, "label", "Metric label");
      requireText(errors, input, "value", "Value");
      optionalText(errors, input, "context", "Context");
      const sortOrder =
        typeof input.sortOrder === "number"
          ? input.sortOrder
          : Number.parseInt(str(input.sortOrder), 10);
      if (str(input.sortOrder) && Number.isNaN(sortOrder)) {
        errors.push("Display order must be a number.");
      }
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          label: str(input.label),
          value: str(input.value),
          context: str(input.context),
          sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
          // `verified` is deliberately absent. It is not accepted from the client at
          // all, so saving this form can never publish an unverified claim. The stored
          // value is preserved by the content route on update. There is currently no
          // in-app way to set it to true: an administrator sets it directly in the
          // database. See docs/owner-handover.md.
        },
      };
    }

    case "pages": {
      requireText(errors, input, "title", "Page title");
      optionalText(errors, input, "summary", "Summary");
      optionalText(errors, input, "body", "Page body", MAX_BODY);
      optionalText(errors, input, "seoTitle", "SEO title", 200);
      optionalText(errors, input, "seoDescription", "SEO description", 400);
      const publishedAt = toIsoOrUndefined(input.publishedAt);
      if (str(input.publishedAt) && !publishedAt) {
        errors.push("Publish date is not a valid date.");
      }
      if (errors.length) return { ok: false, errors };

      return {
        ok: true,
        value: {
          title: str(input.title),
          summary: str(input.summary),
          heroImageUrl: str(input.heroImageUrl),
          seoTitle: str(input.seoTitle),
          seoDescription: str(input.seoDescription),
          body: typeof input.body === "string" ? input.body : "",
          publishedAt: publishedAt ?? "",
          published: input.published === true,
        },
      };
    }

    default: {
      return { ok: false, errors: ["Unknown content section."] };
    }
  }
}

/** True when a valid ISO date is in the future. */
export function isFutureDate(value: unknown): boolean {
  const iso = toIsoOrUndefined(value);
  return Boolean(iso && Date.parse(iso) > Date.now());
}

export { CATEGORIES, FOCUS_AREAS, PROJECT_STATUSES, EVENT_STATUSES };
