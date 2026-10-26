// Tests for the publishing rules that decide what the public may see.
//
// The rules are pure functions in src/lib/cms/visibility.ts, so they can be tested
// directly with an injected clock. The same rules are enforced in SQL by
// public.is_content_visible(), which is what actually protects the public read path;
// supabase/tests/10_rls.sql proves that side against a real database.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isDue,
  isScheduled,
  isPublishedStory,
  isVisiblePage,
  isPublishedEvent,
  isVerifiedMetric,
  isPublishedProject,
} from "../src/lib/cms/visibility.ts";

const NOW = Date.parse("2025-06-15T12:00:00Z");
const PAST = "2025-01-01T00:00:00Z";
const FUTURE = "2999-01-01T00:00:00Z";

test("isDue accepts past dates and rejects future or malformed ones", () => {
  assert.equal(isDue(PAST, NOW), true);
  assert.equal(isDue(FUTURE, NOW), false);
  assert.equal(isDue("", NOW), false);
  assert.equal(isDue(undefined, NOW), false);
  assert.equal(isDue("not a date", NOW), false);
});

test("isScheduled is the complement of isDue for valid dates", () => {
  assert.equal(isScheduled(FUTURE, NOW), true);
  assert.equal(isScheduled(PAST, NOW), false);
  // A malformed date is neither due nor scheduled, so it stays hidden either way.
  assert.equal(isScheduled("nonsense", NOW), false);
  assert.equal(isDue("nonsense", NOW), false);
});

// --- stories -------------------------------------------------------------

test("a published story with a past date is public", () => {
  assert.equal(isPublishedStory({ title: "T", slug: "s", publishedAt: PAST }, NOW), true);
});

test("a story scheduled for the future is hidden", () => {
  assert.equal(isPublishedStory({ title: "T", slug: "s", publishedAt: FUTURE }, NOW), false);
});

test("a story with no publish date is hidden", () => {
  // This preserves the previous loader's behaviour and prevents a half-finished
  // story from appearing the moment it is saved.
  assert.equal(isPublishedStory({ title: "T", slug: "s" }, NOW), false);
  assert.equal(isPublishedStory({ title: "T", slug: "s", publishedAt: "" }, NOW), false);
});

test("a story without a title or slug is hidden", () => {
  assert.equal(isPublishedStory({ slug: "s", publishedAt: PAST }, NOW), false);
  assert.equal(isPublishedStory({ title: "T", publishedAt: PAST }, NOW), false);
});

// --- pages ---------------------------------------------------------------

test("a published page with no date is visible", () => {
  assert.equal(isVisiblePage({ published: true }), true);
});

test("an unpublished page is hidden", () => {
  assert.equal(isVisiblePage({ published: false }), false);
  assert.equal(isVisiblePage({}), false);
});

test("a page scheduled for the future is hidden until then", () => {
  assert.equal(isVisiblePage({ published: true, publishedAt: FUTURE }, NOW), false);
  assert.equal(isVisiblePage({ published: true, publishedAt: PAST }, NOW), true);
});

// --- events --------------------------------------------------------------

test("a published future event is visible", () => {
  assert.equal(
    isPublishedEvent({ status: "Published", startsAt: FUTURE }, NOW),
    true,
  );
});

test("a past event is hidden automatically", () => {
  assert.equal(isPublishedEvent({ status: "Published", startsAt: PAST }, NOW), false);
});

test("a draft or cancelled event is hidden even when dated in the future", () => {
  assert.equal(isPublishedEvent({ status: "Draft", startsAt: FUTURE }, NOW), false);
  assert.equal(isPublishedEvent({ status: "Cancelled", startsAt: FUTURE }, NOW), false);
});

test("an event with a malformed start date is hidden", () => {
  assert.equal(isPublishedEvent({ status: "Published", startsAt: "soon" }, NOW), false);
  assert.equal(isPublishedEvent({ status: "Published" }, NOW), false);
});

// --- impact metrics ------------------------------------------------------

test("only explicitly verified metrics are public", () => {
  assert.equal(isVerifiedMetric({ label: "L", value: "1", verified: true }), true);
  assert.equal(isVerifiedMetric({ label: "L", value: "1", verified: false }), false);
  assert.equal(isVerifiedMetric({ label: "L", value: "1" }), false);
});

test("a verified metric still needs a label and a value", () => {
  assert.equal(isVerifiedMetric({ value: "1", verified: true }), false);
  assert.equal(isVerifiedMetric({ label: "L", verified: true }), false);
});

// --- projects ------------------------------------------------------------

test("a project needs a title and a slug", () => {
  assert.equal(isPublishedProject({ title: "T", slug: "s" }), true);
  assert.equal(isPublishedProject({ title: "T" }), false);
  assert.equal(isPublishedProject({ slug: "s" }), false);
});
