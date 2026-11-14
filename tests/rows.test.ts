import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsToContentRecords } from "../src/lib/cms/rows.ts";

test("database slug is restored to the public content record", () => {
  const [record] = rowsToContentRecords([{
    slug: "community-outreach",
    data: { title: "Community outreach", body: "Story" },
    published: true,
    published_at: "2026-01-02T00:00:00Z",
  }]);
  assert.equal(record.slug, "community-outreach");
  assert.equal(record.title, "Community outreach");
  assert.equal(record.published, true);
  assert.equal(record.publishedAt, "2026-01-02T00:00:00Z");
});

test("explicit content publish date takes precedence over database timestamp", () => {
  const [record] = rowsToContentRecords([{
    slug: "dated-story",
    data: { title: "Dated", publishedAt: "2026-02-03T00:00:00Z" },
    published: true,
    published_at: "2026-02-04T00:00:00Z",
  }]);
  assert.equal(record.publishedAt, "2026-02-03T00:00:00Z");
});

test("invalid row payloads are ignored", () => {
  const records = rowsToContentRecords([
    { slug: "bad", data: null, published: true, published_at: null },
    { slug: "array", data: [], published: true, published_at: null },
    { slug: "ok", data: { title: "Valid" }, published: false, published_at: null },
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].slug, "ok");
});

test("blank content publish date falls back to the database timestamp", () => {
  const [record] = rowsToContentRecords([{
    slug: "published-on-save",
    data: { title: "Published", publishedAt: "" },
    published: true,
    published_at: "2026-11-06T10:00:00Z",
  }]);
  assert.equal(record.publishedAt, "2026-11-06T10:00:00Z");
});
