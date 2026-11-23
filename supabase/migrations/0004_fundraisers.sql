-- Individual fundraisers for Play for Impact, and donation attribution.
--
-- This migration is version-controlled but is NOT applied automatically. Apply
-- it to the REFI Supabase project after 0001_donations.sql.
--
-- Attribution is the whole point of this migration: a donation must be
-- traceable to the fundraiser it was given for, so a campaign total is a sum of
-- confirmed payments and not an editorial claim.
--
-- Free-tier notes:
--   * No extension is required, so this adds no cost on the free tier.
--   * Row level security is enabled with NO policy on both objects. The public
--     never reads these tables directly; server routes read them with the
--     service role, and the public pages receive only the fields they need.

create table if not exists public.fundraisers (
  id             bigint generated always as identity primary key,

  -- The public identifier in /fundraise/<slug>. Constrained so a slug is always
  -- a safe URL segment and cannot be used to inject a path.
  slug           text        not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),

  title          text        not null check (char_length(title) between 3 and 120),

  -- The organiser's own words. Markdown is rendered by react-markdown, which
  -- escapes raw HTML, so this text cannot inject markup.
  story          text        check (story is null or char_length(story) <= 2000),

  -- Optional: the game the organiser plays for this campaign.
  game           text,

  organiser_name text        not null check (char_length(organiser_name) between 2 and 40),

  -- Optional goal in kobo. A campaign without a goal shows what it has raised.
  target_minor   bigint      check (target_minor is null or target_minor > 0),

  -- 'hidden' withdraws a campaign from the public site without deleting its
  -- donations. Only the owner sets this.
  status         text        not null default 'active' check (status in ('active', 'hidden')),

  created_at     timestamptz not null default now()
);

create index if not exists fundraisers_status_created_idx
  on public.fundraisers (status, created_at desc);

alter table public.donations
  add column if not exists fundraiser_slug text references public.fundraisers (slug) on delete set null,
  add column if not exists game           text,
  add column if not exists player_name    text;

create index if not exists donations_fundraiser_idx
  on public.donations (fundraiser_slug, currency);

alter table public.fundraisers enable row level security;

-- Campaign totals are computed in the database, not by fetching every donation
-- into the application. The view is read only by the server with the service
-- role, so it does not need a policy of its own.
create or replace view public.fundraiser_totals as
select
  f.slug,
  f.title,
  f.organiser_name,
  f.game,
  f.target_minor,
  f.status,
  f.created_at,
  coalesce(sum(d.amount_minor) filter (where d.currency = 'NGN'), 0)::bigint as total_minor,
  count(d.id) filter (where d.currency = 'NGN')::integer                      as donation_count
from public.fundraisers f
left join public.donations d on d.fundraiser_slug = f.slug
group by f.id;

comment on table public.fundraisers is
  'Play for Impact campaigns. Written by the server; donations attribute to slug.';
comment on column public.donations.fundraiser_slug is
  'Campaign the donation was made for. Null for a general donation.';
comment on view public.fundraiser_totals is
  'Confirmed NGN donations per campaign. Never sum from client-side data.';
