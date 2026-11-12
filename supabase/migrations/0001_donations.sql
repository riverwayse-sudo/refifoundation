-- Donation records for REFI Play for Impact.
--
-- This migration is version-controlled but is NOT applied automatically. Apply
-- it to the existing Supabase free-tier project before donation records and
-- campaign totals can be stored. Until it is applied, the site reports totals as
-- unavailable and the webhook reports a storage error; it never claims a
-- donation was recorded when it was not.
--
-- Free-tier notes:
--   * No extension is required, so this does not consume any add-on quota.
--   * Row level security is enabled with NO permissive policy, so the table is
--     reachable only by the service role key. The public anon key cannot read or
--     write it, which keeps donor contact details out of the browser entirely.

create table if not exists public.donations (
  id            bigint generated always as identity primary key,

  -- Unique so that a replayed Paystack webhook cannot create a second row.
  -- This constraint is what makes webhook processing idempotent.
  reference     text        not null unique,

  -- Paystack amounts are integers in the minor unit (kobo), never floats, so
  -- totals cannot drift through rounding.
  amount_minor  bigint      not null check (amount_minor > 0),

  currency      text        not null default 'NGN' check (char_length(currency) = 3),

  -- Donor contact details. Never exposed publicly; see the note on RLS above.
  donor_email   text,
  donor_name    text,
  initiative    text,

  paid_at       timestamptz,

  created_at    timestamptz not null default now()
);

-- Campaign totals filter on initiative and currency, so index that pair.
create index if not exists donations_initiative_currency_idx
  on public.donations (initiative, currency);

alter table public.donations enable row level security;

-- Deliberately no policies: with RLS enabled and no policy, only the service
-- role (which bypasses RLS) can access the table. Do not add a public policy
-- that would expose donor details or allow anonymous inserts.

comment on table public.donations is
  'Verified Paystack donations. Written only by the server using the service role key.';
comment on column public.donations.reference is
  'Paystack transaction reference. Unique constraint provides webhook idempotency.';
