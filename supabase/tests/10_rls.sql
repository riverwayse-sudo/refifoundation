-- Row-level security tests for the REFI CMS.
--
-- These run against a real PostgreSQL instance (see scripts/test-rls.sh), not a
-- mock, so they exercise the actual policies the production database will use.
--
-- The point of the suite is to prove the negative cases: that a public caller
-- cannot read drafts, scheduled content or unverified figures, and that a signed-in
-- but unauthorised user cannot write anything at all.

\set ON_ERROR_STOP on

-- Deterministic fixture data.
delete from public.content;
delete from public.cms_admins;

insert into public.cms_admins (user_id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com');

insert into public.content (collection, slug, data, published, published_at) values
  -- Published, in the past: visible.
  ('stories', 'live-story',
   '{"title":"Live story","publishedAt":"2020-01-01T00:00:00Z"}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Published but scheduled in the future: must stay hidden.
  ('stories', 'future-story',
   '{"title":"Future story","publishedAt":"2999-01-01T00:00:00Z"}'::jsonb,
   true, '2999-01-01T00:00:00Z'),
  -- Unpublished draft: must stay hidden.
  ('stories', 'draft-story',
   '{"title":"Draft story"}'::jsonb,
   false, null),
  -- Event in the future and published: visible.
  ('events', 'future-event',
   '{"title":"Future event","status":"Published","startsAt":"2999-01-01T00:00:00Z"}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Event in the past: must stay hidden.
  ('events', 'past-event',
   '{"title":"Past event","status":"Published","startsAt":"2000-01-01T00:00:00Z"}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Event with status Draft: must stay hidden even though the date is future.
  ('events', 'draft-event',
   '{"title":"Draft event","status":"Draft","startsAt":"2999-01-01T00:00:00Z"}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Verified metric: visible.
  ('impact_metrics', 'verified-metric',
   '{"label":"Children reached","value":"100","verified":true}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Unverified metric: must stay hidden.
  ('impact_metrics', 'unverified-metric',
   '{"label":"Unconfirmed","value":"999","verified":false}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Published project: visible.
  ('projects', 'live-project',
   '{"title":"Live project"}'::jsonb,
   true, '2020-01-01T00:00:00Z'),
  -- Unpublished project: hidden.
  ('projects', 'draft-project',
   '{"title":"Draft project"}'::jsonb,
   false, null);

-- Give anon and authenticated the broad privileges Supabase grants, so the tests
-- verify the policies rather than an absence of grants.
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

\echo '--- anon visibility ---'

-- Anon must see exactly the visible rows. Of the 10 fixtures, 4 are visible:
-- live-story, future-event, verified-metric, live-project. The other 6 are
-- scheduled, draft, past-dated, or unverified and must stay hidden.
begin;
set local role anon;
do $$
declare
  visible int;
begin
  select count(*) into visible from public.content;
  if visible <> 4 then
    raise exception 'anon should see 4 visible rows, saw %', visible;
  end if;
end $$;
rollback;

-- Named assertions, so a failure says which rule broke.
begin;
set local role anon;
do $$
declare
  n int;
begin
  select count(*) into n from public.content where slug = 'live-story';
  if n <> 1 then raise exception 'FAIL: published past story should be visible'; end if;

  select count(*) into n from public.content where slug = 'future-story';
  if n <> 0 then raise exception 'FAIL: scheduled future story must be hidden'; end if;

  select count(*) into n from public.content where slug = 'draft-story';
  if n <> 0 then raise exception 'FAIL: unpublished draft story must be hidden'; end if;

  select count(*) into n from public.content where slug = 'future-event';
  if n <> 1 then raise exception 'FAIL: published future event should be visible'; end if;

  select count(*) into n from public.content where slug = 'past-event';
  if n <> 0 then raise exception 'FAIL: past event must be hidden'; end if;

  select count(*) into n from public.content where slug = 'draft-event';
  if n <> 0 then raise exception 'FAIL: draft-status event must be hidden'; end if;

  select count(*) into n from public.content where slug = 'verified-metric';
  if n <> 1 then raise exception 'FAIL: verified metric should be visible'; end if;

  select count(*) into n from public.content where slug = 'unverified-metric';
  if n <> 0 then raise exception 'FAIL: unverified metric must be hidden'; end if;

  select count(*) into n from public.content where slug = 'live-project';
  if n <> 1 then raise exception 'FAIL: published project should be visible'; end if;

  select count(*) into n from public.content where slug = 'draft-project';
  if n <> 0 then raise exception 'FAIL: unpublished project must be hidden'; end if;
end $$;
rollback;

\echo '--- anon cannot write ---'

begin;
set local role anon;
do $$
begin
  begin
    insert into public.content (collection, slug, data, published)
    values ('stories', 'anon-insert', '{"title":"x"}'::jsonb, true);
    raise exception 'FAIL: anon insert should have been denied by RLS';
  exception
    when insufficient_privilege then null; -- expected
  end;
end $$;
rollback;

\echo '--- authenticated non-admin cannot write ---'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
begin
  begin
    insert into public.content (collection, slug, data, published)
    values ('stories', 'auth-insert', '{"title":"x"}'::jsonb, true);
    raise exception 'FAIL: authenticated non-admin insert should have been denied';
  exception
    when insufficient_privilege then null; -- expected
  end;
end $$;
rollback;

\echo '--- authenticated non-admin cannot update or delete ---'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare
  affected int;
begin
  update public.content set published = false where slug = 'live-story';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: non-admin update affected % rows', affected; end if;

  delete from public.content where slug = 'live-story';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: non-admin delete affected % rows', affected; end if;
end $$;
rollback;

\echo '--- admin allow-list is self-read only ---'

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$
declare
  n int;
begin
  select count(*) into n from public.cms_admins;
  if n <> 1 then raise exception 'FAIL: admin should see own allow-list row, saw %', n; end if;
end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$
declare
  n int;
begin
  select count(*) into n from public.cms_admins;
  if n <> 0 then raise exception 'FAIL: non-admin must not read the admin list, saw %', n; end if;
end $$;
rollback;

\echo '--- service_role can write (this is what the server routes rely on) ---'

begin;
set local role service_role;
do $$
begin
  insert into public.content (collection, slug, data, published, published_at)
  values ('stories', 'service-insert', '{"title":"service"}'::jsonb, false, null);

  update public.content set published = true, published_at = '2020-01-01T00:00:00Z'
  where slug = 'service-insert';

  delete from public.content where slug = 'service-insert';
end $$;
rollback;

\echo '--- visibility rules are pure and match the previous loader behaviour ---'

do $$
declare
  ok boolean;
begin
  -- A published story with no date must be hidden: the previous isPast() returned
  -- false for an absent date, so this preserves existing behaviour.
  select public.is_content_visible('stories', '{}'::jsonb, true, null) into ok;
  if ok then raise exception 'FAIL: published story with no date must be hidden'; end if;

  select public.is_content_visible('stories', '{}'::jsonb, true, now() - interval '1 day') into ok;
  if not ok then raise exception 'FAIL: published past story must be visible'; end if;

  select public.is_content_visible('pages', '{}'::jsonb, true, null) into ok;
  if not ok then raise exception 'FAIL: published page with no date must be visible'; end if;

  -- Malformed dates must not raise; they should simply not be treated as visible.
  select public.is_content_visible('events', '{"status":"Published","startsAt":"not-a-date"}'::jsonb, true, now()) into ok;
  if ok then raise exception 'FAIL: malformed startsAt must not be visible'; end if;
end $$;

\echo 'ALL RLS TESTS PASSED'
