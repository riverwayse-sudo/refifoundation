"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// The dashboard is data-driven: each collection declares its fields once, and the
// same declarations drive the list, the editor and the save payload. That keeps the
// UI consistent with the server-side validation rules without duplicating markup.

type FieldType = "text" | "textarea" | "markdown" | "date" | "datetime" | "select" | "image" | "number";

type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: string[];
  /** Present in the record but never editable here (verification is editorial). */
  readOnly?: boolean;
};

type Collection = {
  key: string;
  title: string;
  description: string;
  /** True when the collection holds a single record rather than a list. */
  singleton?: boolean;
  titleField: string;
  fields: Field[];
};

const CATEGORIES = ["Education", "Community", "Sport & wellbeing", "News", "Impact"];
const FOCUS_AREAS = ["Education", "Community support", "Sport & wellbeing"];
const PROJECT_STATUSES = ["Planned", "Active", "Completed"];
const EVENT_STATUSES = ["Draft", "Published", "Cancelled"];

const COLLECTIONS: Collection[] = [
  {
    key: "home",
    title: "Home page",
    description: "The headline and introduction at the top of the website.",
    singleton: true,
    titleField: "heroTitle",
    fields: [
      { name: "heroEyebrow", label: "Small line above the headline", type: "text" },
      { name: "heroTitle", label: "Headline", type: "text", required: true },
      { name: "heroDescription", label: "Introduction", type: "textarea", required: true },
      { name: "primaryCtaLabel", label: "Main button text", type: "text", required: true },
      { name: "primaryCtaUrl", label: "Main button link", type: "text", required: true, help: "For example /donate" },
      { name: "secondaryCtaLabel", label: "Second button text", type: "text" },
      { name: "secondaryCtaUrl", label: "Second button link", type: "text" },
      { name: "introHeading", label: "Introduction heading", type: "text" },
      { name: "introBody", label: "Introduction text", type: "textarea" },
      { name: "heroImageUrl", label: "Main image", type: "image" },
    ],
  },
  {
    key: "stories",
    title: "Stories",
    description: "News and updates from the Foundation.",
    titleField: "title",
    fields: [
      { name: "title", label: "Headline", type: "text", required: true },
      { name: "excerpt", label: "Short summary", type: "textarea", required: true, help: "Shown in listings." },
      { name: "category", label: "Category", type: "select", required: true, options: CATEGORIES },
      { name: "publishedAt", label: "Date", type: "date", help: "Leave blank to keep the story hidden." },
      { name: "coverImageUrl", label: "Cover image", type: "image" },
      { name: "body", label: "Story", type: "markdown" },
    ],
  },
  {
    key: "projects",
    title: "Projects",
    description: "The Foundation's programmes and areas of work.",
    titleField: "title",
    fields: [
      { name: "title", label: "Project name", type: "text", required: true },
      { name: "summary", label: "Summary", type: "textarea", required: true },
      { name: "focusArea", label: "Focus area", type: "select", required: true, options: FOCUS_AREAS },
      { name: "status", label: "Status", type: "select", required: true, options: PROJECT_STATUSES },
      { name: "coverImageUrl", label: "Cover image", type: "image" },
    ],
  },
  {
    key: "events",
    title: "Events",
    description: "Upcoming events. Past events are hidden automatically.",
    titleField: "title",
    fields: [
      { name: "title", label: "Event name", type: "text", required: true },
      { name: "startsAt", label: "Starts", type: "datetime", required: true },
      { name: "endsAt", label: "Ends", type: "datetime" },
      { name: "location", label: "Location", type: "text" },
      { name: "summary", label: "Description", type: "textarea" },
      { name: "registrationUrl", label: "Registration link", type: "text" },
      { name: "coverImageUrl", label: "Cover image", type: "image" },
      { name: "status", label: "Status", type: "select", required: true, options: EVENT_STATUSES },
    ],
  },
  {
    key: "impact_metrics",
    title: "Impact figures",
    description: "Figures shown on the Impact page.",
    titleField: "label",
    fields: [
      { name: "label", label: "What the figure describes", type: "text", required: true },
      { name: "value", label: "The figure", type: "text", required: true },
      { name: "context", label: "Extra detail", type: "text" },
      { name: "sortOrder", label: "Display order", type: "number" },
    ],
  },
  {
    key: "pages",
    title: "Other pages",
    description: "Additional pages, such as policies or annual reports.",
    titleField: "title",
    fields: [
      { name: "title", label: "Page title", type: "text", required: true },
      { name: "summary", label: "Short summary", type: "textarea" },
      { name: "heroImageUrl", label: "Top image", type: "image" },
      { name: "body", label: "Page content", type: "markdown" },
      { name: "seoTitle", label: "Search engine title", type: "text", help: "Optional. Leave blank to use the page title." },
      { name: "seoDescription", label: "Search engine description", type: "textarea" },
      { name: "publishedAt", label: "Publish date", type: "date" },
    ],
  },
];

type Item = {
  id: string;
  collection: string;
  slug: string;
  data: Record<string, unknown>;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

const EMPTY_MESSAGE = "No content yet. Use the button above to add the first item.";

/** Formats an ISO timestamp for display, tolerating invalid values. */
function formatWhen(value: string | null): string {
  if (!value) return "not published";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "not published";
  return new Date(parsed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Converts a stored value into the form control's expected value. */
function toFieldValue(field: Field, value: unknown): string {
  if (value === undefined || value === null) return "";
  const raw = String(value);
  if (!raw) return "";
  if (field.type === "date") return raw.slice(0, 10);
  if (field.type === "datetime") {
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) return "";
    // datetime-local expects local time without a timezone suffix.
    const date = new Date(parsed);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return raw;
}

export function CmsDashboard({ email }: { email: string }) {
  const [activeKey, setActiveKey] = useState(COLLECTIONS[0].key);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<{ slug: string; values: Record<string, string>; published: boolean } | null>(null);

  const active = useMemo(
    () => COLLECTIONS.find((collection) => collection.key === activeKey) ?? COLLECTIONS[0],
    [activeKey],
  );

  // State is updated only from promise callbacks, never synchronously in the effect
  // body, so the initial load does not cause a cascading render.
  const load = useCallback((collectionKey: string) => {
    fetch(`/api/cms/content?collection=${encodeURIComponent(collectionKey)}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, payload: (await response.json()) as { items?: Item[]; error?: string } }))
      .then(({ ok, payload }) => {
        if (!ok) {
          setItems([]);
          setError(payload.error ?? "Could not load content.");
          return;
        }
        setItems(payload.items ?? []);
        setError("");
      })
      .catch(() => {
        setItems([]);
        setError("Could not load content. Please check your connection.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(activeKey);
  }, [activeKey, load]);

  /** Starts a load from an event handler, showing the loading state immediately. */
  function reload(collectionKey: string) {
    setLoading(true);
    void load(collectionKey);
  }

  function startNew() {
    const values: Record<string, string> = {};
    for (const field of active.fields) values[field.name] = "";
    setEditing({ slug: "", values, published: false });
    setStatus("");
  }

  function startEdit(item: Item) {
    const values: Record<string, string> = {};
    for (const field of active.fields) values[field.name] = toFieldValue(field, item.data[field.name]);
    setEditing({ slug: item.slug, values, published: item.published });
    setStatus("");
  }

  function setField(name: string, value: string) {
    setEditing((current) => (current ? { ...current, values: { ...current.values, [name]: value } } : current));
  }

  async function save(publish: boolean) {
    if (!editing) return;
    setStatus("");
    setError("");

    // Client-side check for a friendlier message; the server validates again and
    // is the authority.
    const missing = active.fields.filter((field) => field.required && !editing.values[field.name]?.trim());
    if (missing.length) {
      setError(`Please complete: ${missing.map((field) => field.label).join(", ")}.`);
      return;
    }

    const data: Record<string, unknown> = {};
    for (const field of active.fields) {
      const value = editing.values[field.name] ?? "";
      if (field.type === "number") {
        const parsed = Number.parseInt(value, 10);
        data[field.name] = Number.isNaN(parsed) ? 0 : parsed;
      } else {
        data[field.name] = value;
      }
    }
    if (active.key === "impact_metrics") {
      // Verification is editorial and set in the database, never by this form.
      data.verified = false;
    }

    const slug = active.singleton ? "home" : editing.slug || slugFrom(data[active.titleField]);

    try {
      const response = await fetch("/api/cms/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: active.key,
          slug,
          data,
          published: publish,
          publishAt: editing.values.publishedAt,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not save.");
        return;
      }

      if (publish) {
        await fetch("/api/cms/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collection: active.key, slug, publishAt: editing.values.publishedAt }),
        }).catch(() => undefined);
      }

      setStatus(publish ? "Saved and published. The website will update shortly." : "Saved as a draft.");
      setEditing(null);
      reload(active.key);
    } catch {
      setError("Could not save. Please check your connection and try again.");
    }
  }

  async function uploadImage(fieldName: string, file: File) {
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/cms/media", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      setField(fieldName, payload.url);
    } catch {
      setError("Upload failed. Please try again.");
    }
  }

  async function signOut() {
    await fetch("/api/cms/session/sign-out", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  return (
    <div className="refi-admin">
      <header className="refi-admin-header">
        <div>
          <h1>Content manager</h1>
          <p className="refi-admin-note">Signed in as {email}</p>
        </div>
        <button className="refi-button refi-button-secondary" type="button" onClick={signOut}>
          Sign out
        </button>
      </header>

      <nav className="refi-admin-tabs" aria-label="Content sections">
        {COLLECTIONS.map((collection) => (
          <button
            key={collection.key}
            type="button"
            className={collection.key === activeKey ? "refi-admin-tab refi-admin-tab-active" : "refi-admin-tab"}
            aria-current={collection.key === activeKey}
            onClick={() => {
              setActiveKey(collection.key);
              setEditing(null);
              setStatus("");
              setLoading(true);
            }}
          >
            {collection.title}
          </button>
        ))}
      </nav>

      {status ? <p className="refi-admin-success" role="status">{status}</p> : null}
      {error ? <p className="refi-admin-error" role="alert">{error}</p> : null}

      {editing ? (
        <section className="refi-admin-card">
          <h2>{editing.slug ? `Editing: ${editing.slug}` : `New ${active.title.toLowerCase().replace(/s$/, "")}`}</h2>
          <p className="refi-admin-note">{active.description}</p>
          <div className="refi-admin-form">
            {active.fields.map((field) => (
              <div className="refi-admin-field" key={field.name}>
                <label htmlFor={`field-${field.name}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={`field-${field.name}`}
                    rows={3}
                    value={editing.values[field.name] ?? ""}
                    onChange={(event) => setField(field.name, event.target.value)}
                  />
                ) : field.type === "markdown" ? (
                  <textarea
                    id={`field-${field.name}`}
                    rows={14}
                    value={editing.values[field.name] ?? ""}
                    onChange={(event) => setField(field.name, event.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`field-${field.name}`}
                    value={editing.values[field.name] ?? ""}
                    onChange={(event) => setField(field.name, event.target.value)}
                  >
                    <option value="">Choose…</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "image" ? (
                  <div className="refi-admin-image">
                    <input
                      id={`field-${field.name}`}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadImage(field.name, file);
                      }}
                    />
                    {editing.values[field.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editing.values[field.name]} alt="" className="refi-admin-thumb" />
                    ) : null}
                  </div>
                ) : (
                  <input
                    id={`field-${field.name}`}
                    type={field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text"}
                    value={editing.values[field.name] ?? ""}
                    onChange={(event) => setField(field.name, event.target.value)}
                  />
                )}
                {field.help ? <p className="refi-admin-help">{field.help}</p> : null}
              </div>
            ))}

            {!active.singleton ? (
              <div className="refi-admin-field">
                <label htmlFor="field-slug">Web address</label>
                <input
                  id="field-slug"
                  type="text"
                  value={editing.slug}
                  placeholder="for-example-our-first-year"
                  onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
                />
                <p className="refi-admin-help">Leave blank to build it from the title.</p>
              </div>
            ) : null}

            <div className="refi-admin-actions">
              <button className="refi-button refi-button-secondary" type="button" onClick={() => save(false)}>
                Save draft
              </button>
              <button className="refi-button refi-button-primary" type="button" onClick={() => save(true)}>
                Publish
              </button>
              <button className="refi-admin-link" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="refi-admin-card">
          <div className="refi-admin-list-header">
            <h2>{active.title}</h2>
            {!active.singleton || items.length === 0 ? (
              <button className="refi-button refi-button-primary" type="button" onClick={startNew}>
                Add new
              </button>
            ) : null}
          </div>
          <p className="refi-admin-note">{active.description}</p>

          {loading ? (
            <p className="refi-admin-note">Loading…</p>
          ) : items.length === 0 ? (
            <p className="refi-admin-note">{EMPTY_MESSAGE}</p>
          ) : (
            <ul className="refi-admin-list">
              {items.map((item) => (
                <li key={item.id} className="refi-admin-list-item">
                  <div>
                    <strong>{String(item.data[active.titleField] ?? item.slug)}</strong>
                    <p className="refi-admin-help">
                      {item.published ? `Published ${formatWhen(item.published_at)}` : "Draft"} · /{item.slug}
                    </p>
                  </div>
                  <button className="refi-button refi-button-secondary" type="button" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Builds a URL-safe slug from a title. */
function slugFrom(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
