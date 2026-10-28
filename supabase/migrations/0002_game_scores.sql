-- Game score records for the Games for Charity hub.
--
-- This migration is version-controlled but is NOT applied automatically. Do not
-- apply it to the REFI Supabase project without explicit owner approval.
--
-- Read this before enabling it:
--   A score submitted by a browser is untrusted. This table exists so that a
--   future server-issued game session can record a score that the server itself
--   observed. It is deliberately NOT wired up yet: /api/scores validates
--   submissions and declines to store them, because without an authoritative
--   session the server cannot tell a real round from a typed-in number.
--
--   Applying this migration alone does not make scores trustworthy. The
--   application must first issue a session on the server and record the score
--   against that session. Until then, keep the public leaderboard disabled.
--
-- Free-tier notes:
--   * No extension is required, so this adds no cost on the free tier.
--   * Row level security is enabled with NO permissive policy, so the table is
--     reachable only by the service role. The public anon key cannot read or
--     write it, which keeps display names and score history out of the browser.
--   * Indexes are limited to what the leaderboard query needs, to keep the
--     write cost and table size small.

create table if not exists public.game_scores (
  id            bigint generated always as identity primary key,

  -- A server-issued session identifier. NOT NULL on purpose: a score must not
  -- be storable without a session the server created and can validate.
  session_id    uuid        not null,

  game          text        not null,

  -- Score bounds are re-checked here, so a bug in application code cannot
  -- persist an out-of-range value.
  score         integer     not null check (score >= 0 and score <= 100000),

  -- Round duration in milliseconds, bounded to a believable range.
  duration_ms   integer     not null check (duration_ms >= 1000 and duration_ms <= 3600000),

  -- Display name only. Never store an email address or any other identifier
  -- here; the leaderboard reads this column.
  display_name  text        not null check (char_length(display_name) between 2 and 24),

  created_at    timestamptz not null default now(),

  -- One row per session and game, so a replayed submission cannot create a
  -- second row for the same round. This is the idempotency constraint.
  unique (session_id, game)
);

-- The leaderboard ranks the best score per game, so index that access path.
create index if not exists game_scores_game_score_idx
  on public.game_scores (game, score desc);

alter table public.game_scores enable row level security;

-- Deliberately no policies: with RLS enabled and no policy, only the service
-- role (which bypasses RLS) can access the table. Do not add a public policy
-- that would allow anonymous inserts or expose score history.

comment on table public.game_scores is
  'Verified game scores. Written only by the server, against a server-issued session.';
comment on column public.game_scores.session_id is
  'Server-issued game session. Unique with game, providing submission idempotency.';
comment on column public.game_scores.display_name is
  'Public display name only. Must never contain an email address or other identifier.';
