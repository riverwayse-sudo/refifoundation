import { defineField, defineType } from "sanity";

const seoFields = [
  defineField({ name: "seoTitle", title: "SEO title", type: "string", validation: (rule) => rule.max(60) }),
  defineField({ name: "seoDescription", title: "SEO description", type: "text", rows: 3, validation: (rule) => rule.max(160) }),
];

export const sitePage = defineType({
  name: "sitePage", title: "Website pages", type: "document",
  fields: [
    defineField({ name: "title", title: "Page title", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "URL slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Intro / summary", type: "text", rows: 3 }),
    defineField({ name: "body", title: "Page content", type: "array", of: [{ type: "block" }, { type: "image", options: { hotspot: true } }] }),
    defineField({ name: "heroImage", title: "Hero image", type: "image", options: { hotspot: true } }),
    ...seoFields,
    defineField({ name: "publishedAt", title: "Published at", type: "datetime" }),
  ],
});

export const story = defineType({
  name: "story", title: "Stories & news", type: "document",
  fields: [
    defineField({ name: "title", title: "Headline", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "URL slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "excerpt", title: "Short summary", type: "text", rows: 3, validation: (rule) => rule.max(240) }),
    defineField({ name: "category", title: "Category", type: "string", options: { list: ["Education", "Community", "Sport & wellbeing", "News", "Impact"] } }),
    defineField({ name: "coverImage", title: "Cover image", type: "image", options: { hotspot: true } }),
    defineField({ name: "body", title: "Story", type: "array", of: [{ type: "block" }, { type: "image", options: { hotspot: true } }] }),
    defineField({ name: "publishedAt", title: "Publication date", type: "datetime" }),
    defineField({ name: "isFeatured", title: "Feature this story", type: "boolean", initialValue: false }),
    ...seoFields,
  ],
});

export const project = defineType({
  name: "project", title: "Projects & programmes", type: "document",
  fields: [
    defineField({ name: "title", title: "Project name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "URL slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3, validation: (rule) => rule.required() }),
    defineField({ name: "focusArea", title: "Focus area", type: "string", options: { list: ["Education", "Community support", "Sport & wellbeing"] } }),
    defineField({ name: "status", title: "Status", type: "string", options: { list: ["Planned", "Active", "Completed"] }, initialValue: "Planned" }),
    defineField({ name: "coverImage", title: "Project image", type: "image", options: { hotspot: true } }),
    defineField({ name: "body", title: "Details", type: "array", of: [{ type: "block" }, { type: "image", options: { hotspot: true } }] }),
    defineField({ name: "isFeatured", title: "Feature on website", type: "boolean", initialValue: false }),
    ...seoFields,
  ],
});

export const event = defineType({
  name: "event", title: "Events", type: "document",
  fields: [
    defineField({ name: "title", title: "Event name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "slug", title: "URL slug", type: "slug", options: { source: "title" }, validation: (rule) => rule.required() }),
    defineField({ name: "startsAt", title: "Start date and time", type: "datetime", validation: (rule) => rule.required() }),
    defineField({ name: "endsAt", title: "End date and time", type: "datetime" }),
    defineField({ name: "location", title: "Location / online details", type: "string" }),
    defineField({ name: "summary", title: "Description", type: "text", rows: 3 }),
    defineField({ name: "registrationUrl", title: "Registration URL", type: "url" }),
    defineField({ name: "coverImage", title: "Event image", type: "image", options: { hotspot: true } }),
    defineField({ name: "status", title: "Status", type: "string", options: { list: ["Draft", "Published", "Cancelled"] }, initialValue: "Draft" }),
    ...seoFields,
  ],
});

export const impactMetric = defineType({
  name: "impactMetric", title: "Impact statistics", type: "document",
  fields: [
    defineField({ name: "label", title: "Metric label", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "value", title: "Value", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "context", title: "Explanation / reporting period", type: "string" }),
    defineField({ name: "sortOrder", title: "Display order", type: "number", initialValue: 0 }),
    defineField({ name: "verified", title: "Verified for publication", type: "boolean", initialValue: false, description: "Only publish impact figures that have been checked." }),
  ],
});

export const matchFeature = defineType({
  name: "matchFeature", title: "Featured matches", type: "document",
  fields: [
    defineField({ name: "label", title: "Editorial label", type: "string", description: "For example: Match of the week." }),
    defineField({ name: "fixtureId", title: "Provider fixture ID", type: "number", validation: (rule) => rule.required() }),
    defineField({ name: "isFeatured", title: "Show as featured", type: "boolean", initialValue: true }),
    defineField({ name: "sortOrder", title: "Display order", type: "number", initialValue: 0 }),
  ],
});

export const schemaTypes = [sitePage, story, project, event, impactMetric, matchFeature];
