-- REFI Foundation CMS — schema and row-level security.
--
-- Run this against the REFI Supabase project (SQL editor or `supabase db push`).
-- It is written to be idempotent so it can be re-applied safely.
--
-- Design notes
-- ------------
-- The public website reads content at BUILD time (Option B), so the public read
-- path uses the anon key and is governed entirely by the SELECT policy below.
-- That policy exposes only rows the publishing rules consider visible, which
-- means the anon key -- which is public by design -- cannot be used to read
-- drafts, scheduled stories or unverified impact figures.
--
-- Writes never happen with the anon key. They go through server route handlers
-- that hold the service-role key and first verify the caller is a listed admin.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

-- The allow-list of people who may use the CMS. A signed-in Supabase user who is
-- not in this table can authenticate but can do nothing: every write route checks
-- this table, and the RLS policies below grant no write access to `authenticated`.
create table if not exists public.cms_admins (
  user_id    uuid primary key,
  email      text not null,
  created_at timestamptz not null default now()
);

comment on table public.cms_admins is
  'Allow-list of CMS administrators. Membership is required for all write access.';

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

-- One row per content record. `data` holds the same shape the previous JSON files
-- used, so existing loaders and templates keep working unchanged.
create table if not exists public.content (
  id           uuid primary key default gen_random_uuid(),
  collection   text not null,
  slug         text not null,
  data         jsonb not null default '{}'::jsonb,
  published    boolean not null default false,
  published_at timestamptz,
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  constraint content_collection_check check (
    collection in ('home', 'stories', 'projects', 'events', 'impact_metrics', 'pages')
  ),
  constraint content_slug_check check (length(trim(slug)) > 0),
  constraint content_unique_slug unique (collection, slug)
);

comment on table public.content is
  'CMS content records. Public read is filtered by public.is_content_visible().';

create index if not exists content_collection_idx on public.content (collection);
create index if not exists content_published_idx on public.content (published);

-- Keep updated_at honest without trusting the client to send it.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists content_touch_updated_at on public.content;
create trigger content_touch_updated_at
  before update on public.content
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Visibility rules
-- ---------------------------------------------------------------------------

-- Parse a JSON string into timestamptz without raising on malformed input.
-- A bad value yields NULL, which the rules below treat as "not scheduled".
create or replace function public.safe_ts(value jsonb) returns timestamptz
language sql immutable as $$
  select case
    when value is null or jsonb_typeof(value) <> 'string' then null
    when (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}' then (value #>> '{}')::timestamptz
    else null
  end;
$$;

-- The single source of truth for "may the public see this row?".
--
-- These rules mirror the filters that previously lived in src/lib/content.ts, so
-- moving content into the database does not change what the public can see:
--   stories        published AND publishedAt in the past (a story with no date
--                  stays hidden, matching the previous isPast() behaviour)
--   pages          published AND publishedAt not in the future
--   events         status = 'Published' AND startsAt in the future
--   impact_metrics verified = true
--   projects/home  published
create or replace function public.is_content_visible(
  p_collection   text,
  p_data         jsonb,
  p_published    boolean,
  p_published_at timestamptz
) returns boolean
language sql stable as $$
  select case
    when not p_published then false
    when p_collection = 'stories' then
      p_published_at is not null and p_published_at <= now()
    when p_collection = 'pages' then
      p_published_at is null or p_published_at <= now()
    when p_collection = 'events' then
      coalesce(p_data->>'status', '') = 'Published'
      and public.safe_ts(p_data->'startsAt') is not null
      and public.safe_ts(p_data->'startsAt') >= now()
    when p_collection = 'impact_metrics' then
      coalesce(p_data->>'verified', 'false') = 'true'
    else
      true
  end;
$$;

comment on function public.is_content_visible is
  'Public visibility rules for CMS content. Used by the SELECT policy and the build-time reader.';

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.content enable row level security;
alter table public.cms_admins enable row level security;

-- Reads: anonymous visitors (and therefore the build-time reader using the anon
-- key) see only rows that pass the visibility rules. This is what keeps drafts
-- and scheduled content out of any public path, including a leaked anon key.
drop policy if exists content_public_read on public.content;
create policy content_public_read on public.content
  for select
  to anon, authenticated
  using (public.is_content_visible(collection, data, published, published_at));

-- Writes: deliberately no policy for anon or authenticated. Without a policy,
-- row-level security denies by default, so a signed-in user still cannot write
-- through the anon key. Writes require the service-role key, which is held only
-- by server route handlers that check the admin allow-list first.

-- Admins may read their own allow-list row only, so the dashboard can confirm
-- access without exposing the list of administrators to anyone else.
drop policy if exists cms_admins_self_read on public.cms_admins;
create policy cms_admins_self_read on public.cms_admins
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Public bucket for published media. Writes are performed server-side with the
-- service-role key after the caller is authorised, so no storage write policy is
-- granted here.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
