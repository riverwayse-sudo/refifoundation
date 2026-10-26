// Unit tests for CMS validation.
//
// Run with `npm run test:cms`, which uses Node's built-in test runner and its
// native TypeScript support. No test framework dependency is added, keeping the
// zero-cost rule intact.
//
// The emphasis is on negative cases: what must be rejected. A validator that only
// accepts good input has not been shown to reject bad input.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateContent,
  normaliseSlug,
  isValidSlug,
  toIsoOrUndefined,
  isFutureDate,
} from "../src/lib/cms/validation.ts";

test("normaliseSlug makes a URL-safe value", () => {
  assert.equal(normaliseSlug("Hello World!"), "hello-world");
  assert.equal(normaliseSlug("  Multiple   Spaces  "), "multiple-spaces");
  assert.equal(normaliseSlug("Accents é and ü"), "accents-and");
  assert.equal(normaliseSlug("--leading-and-trailing--"), "leading-and-trailing");
  assert.equal(normaliseSlug(""), "");
});

test("isValidSlug rejects values that would break routing", () => {
  assert.equal(isValidSlug("valid-slug"), true);
  assert.equal(isValidSlug("a1-b2"), true);
  assert.equal(isValidSlug(""), false);
  assert.equal(isValidSlug("Has-Caps"), false);
  assert.equal(isValidSlug("has spaces"), false);
  assert.equal(isValidSlug("trailing-"), false);
  assert.equal(isValidSlug("a".repeat(81)), false);
});

test("toIsoOrUndefined handles empty and malformed input without throwing", () => {
  assert.equal(toIsoOrUndefined(""), undefined);
  assert.equal(toIsoOrUndefined(undefined), undefined);
  assert.equal(toIsoOrUndefined("not a date"), undefined);
  assert.equal(toIsoOrUndefined("2024-03-01"), "2024-03-01T00:00:00.000Z");
});

test("isFutureDate only accepts future ISO dates", () => {
  assert.equal(isFutureDate("2999-01-01T00:00:00Z"), true);
  assert.equal(isFutureDate("2000-01-01T00:00:00Z"), false);
  assert.equal(isFutureDate("garbage"), false);
  assert.equal(isFutureDate(""), false);
});

// --- stories -------------------------------------------------------------

test("a valid story is accepted and normalised", () => {
  const result = validateContent("stories", {
    title: "  A headline  ",
    excerpt: "A summary",
    category: "News",
    body: "Body text",
    publishedAt: "2024-05-01",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, "A headline", "should be trimmed");
    assert.equal(result.value.category, "News");
  }
});

test("a story missing required fields is rejected with reasons", () => {
  const result = validateContent("stories", { category: "News" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    const joined = result.errors.join(" ");
    assert.match(joined, /Headline is required/);
    assert.match(joined, /Summary is required/);
  }
});

test("a story with an unknown category is rejected", () => {
  const result = validateContent("stories", {
    title: "T",
    excerpt: "E",
    category: "Politics",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Category must be one of/);
});

test("a story with an invalid publish date is rejected", () => {
  const result = validateContent("stories", {
    title: "T",
    excerpt: "E",
    category: "News",
    publishedAt: "31/12/2024",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /not a valid date/);
});

test("unexpected fields are not persisted", () => {
  const result = validateContent("stories", {
    title: "T",
    excerpt: "E",
    category: "News",
    isAdmin: true,
    published: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal("isAdmin" in result.value, false, "unknown fields must be dropped");
    assert.equal("published" in result.value, false, "stories do not carry a published flag");
  }
});

// --- events --------------------------------------------------------------

test("an event ending before it starts is rejected", () => {
  const result = validateContent("events", {
    title: "Gala",
    status: "Published",
    startsAt: "2025-06-01T18:00:00Z",
    endsAt: "2025-06-01T17:00:00Z",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /cannot be before the start/);
});

test("an event with an invalid status is rejected", () => {
  const result = validateContent("events", {
    title: "Gala",
    status: "Live",
    startsAt: "2025-06-01T18:00:00Z",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Status must be one of/);
});

test("an event without a start date is rejected", () => {
  const result = validateContent("events", { title: "Gala", status: "Published" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Start date and time is required/);
});

// --- impact metrics ------------------------------------------------------

test("an impact metric cannot be self-verified through the form", () => {
  const result = validateContent("impact_metrics", {
    label: "Children reached",
    value: "1,200",
    verified: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    // Verification is an editorial decision made outside this form. The field must
    // not appear in the validated output at all, so a crafted request cannot set it;
    // the content route carries any existing verified value forward instead.
    assert.equal(
      "verified" in result.value,
      false,
      "the form must not be able to set or clear verification",
    );
  }
});

test("an impact metric requires a label and a value", () => {
  const result = validateContent("impact_metrics", { context: "Some context" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /Metric label is required/);
    assert.match(result.errors.join(" "), /Value is required/);
  }
});

test("a non-numeric display order is rejected", () => {
  const result = validateContent("impact_metrics", {
    label: "L",
    value: "1",
    sortOrder: "first",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Display order must be a number/);
});

// --- pages ---------------------------------------------------------------

test("a page records its published flag", () => {
  const draft = validateContent("pages", { title: "Policy" });
  assert.equal(draft.ok, true);
  if (draft.ok) assert.equal(draft.value.published, false);

  const live = validateContent("pages", { title: "Policy", published: true });
  assert.equal(live.ok, true);
  if (live.ok) assert.equal(live.value.published, true);
});

test("a page title is required", () => {
  const result = validateContent("pages", { summary: "No title" });
  assert.equal(result.ok, false);
});

// --- home ----------------------------------------------------------------

test("home requires the headline and introduction", () => {
  const result = validateContent("home", { heroEyebrow: "Welcome" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join(" "), /Hero title is required/);
    assert.match(result.errors.join(" "), /Hero description is required/);
  }
});

test("a complete home record is accepted", () => {
  const result = validateContent("home", {
    heroTitle: "Building opportunity",
    heroDescription: "What we do.",
    primaryCtaLabel: "Donate",
    primaryCtaUrl: "/donate",
  });
  assert.equal(result.ok, true);
});

// --- length limits -------------------------------------------------------

test("over-long text is rejected rather than silently truncated", () => {
  const result = validateContent("stories", {
    title: "T",
    excerpt: "E",
    category: "News",
    body: "x".repeat(100_001),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.join(" "), /Story body must be/);
});
