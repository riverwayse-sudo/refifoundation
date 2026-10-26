-- Stubs that stand in for the Supabase-managed parts of the database, so the
-- migration and its row-level security policies can be exercised against a plain
-- PostgreSQL instance. This is what makes the RLS tests runnable in CI.
--
-- These objects exist already in a real Supabase project; creating them here is
-- harmless and makes the migration portable.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  -- service_role bypasses RLS in Supabase; that is the property the write path
  -- depends on, so it must be reproduced faithfully here.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists auth;

-- Mirrors auth.uid(): the caller's user id, read from the JWT claim that
-- PostgREST sets. Returns NULL when unauthenticated, as in Supabase.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

-- Supabase grants broad table privileges to anon and authenticated and relies on
-- row-level security to restrict what they can actually see and change. Reproducing
-- that here is what makes the RLS tests meaningful: if the tests pass, it is the
-- policies doing the work, not merely an absence of grants.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

