# Provisioning checklist

This page lists what must exist before each integration becomes operational. The
application is built to run without these values. When a value is missing, the
affected route answers with an honest refusal instead of a fabricated success.
That behaviour is deliberate: do not replace it with a placeholder.

Read the whole page before you start. Some checks must pass before you enter the
next value.

## 1. Order of work

1. Create the Supabase project and apply the migrations.
2. Set the Supabase values in Vercel.
3. Create the editor account.
4. Set the Brevo values and send a test enquiry.
5. Set the Paystack **test** values and run the payment acceptance test.
6. Set the API-Football value and confirm the live feed.
7. Replace the test payment values with live values only after step 5 passes.

Do not set a live payment key before the test-mode acceptance test passes.

## 2. Environment variables

Set these in Vercel under **Settings → Environment Variables**. Use the
**Production** scope for live values. Use the **Preview** scope for test values.

| Variable | Scope | Needed by | Notes |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Production, Preview | CMS, donations, scores | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | Production, Preview, Build | Public content reads | Shipped to the browser. Row level security limits what it can read |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | CMS writes, donations, scores | Server only. Never add a `NEXT_PUBLIC_` prefix |
| `PAYSTACK_SECRET_KEY` | Production | Donations | `sk_live_…` in Production, `sk_test_…` in Preview. Server only |
| `PAYSTACK_API_BASE` | Optional | Donations | Test hook for a mock provider. Leave unset in Production |
| `SCORE_SESSION_SECRET` | Production, Preview | Game scores | At least 32 random bytes, base64 or hex. Server only. Without it, scores stay local to the device |
| `BREVO_API_KEY` | Production | Contact form | Server only |
| `BREVO_SENDER_EMAIL` | Production | Contact form | Must be a verified sender in Brevo |
| `BREVO_SENDER_NAME` | Production | Contact form | Display name on the email |
| `REFI_CONTACT_EMAIL` | Production | Contact form | Where enquiries are delivered |
| `API_FOOTBALL_KEY` | Production | Match Centre | Free plan. Server only |
| `LIVE_SCORE_DAILY_BUDGET` | Production | Match Centre | Requests per day the plan allows. Set it to the plan value, not a guess |
| `FOOTBALL_REFRESH_SECONDS` | Optional | Match Centre | Cache lifetime. Defaults to 120 |
| `FOOTBALL_API_BASE` | Optional | Match Centre | Test hook for a mock provider. Leave unset in Production |
| `CRON_SECRET` | Production | CMS keep-alive, games sweep | Vercel cron sends `Authorization: Bearer <CRON_SECRET>` |

`NEXT_PUBLIC_SITE_URL` is not read. Canonical URLs come from a constant in
`src/lib/site.ts`. Do not add it back: a deployment alias once leaked into the
canonical tag and into `X-Robots-Tag`.

## 3. Keep test and production apart

| Concern | Test | Production |
| --- | --- | --- |
| Supabase | A second free project, `refi-staging` | `refi-production` |
| Paystack | `sk_test_…` in the Preview scope | `sk_live_…` in the Production scope |
| API-Football | Same key, lower `LIVE_SCORE_DAILY_BUDGET` | Same key, plan budget |
| Brevo | Same key, `REFI_CONTACT_EMAIL` set to an internal inbox | The public inbox |

The free Supabase plan allows two projects. Use both. A test donation must never
reach the production donations table.

## 4. Supabase

1. Create the project in the region closest to Lagos.
2. Apply the migrations in order in the SQL editor:

   1. `supabase/migrations/0001_donations.sql`
   2. `supabase/migrations/0002_game_scores.sql`
   3. `supabase/migrations/0003_cms_schema.sql`
   4. `supabase/migrations/0004_fundraisers.sql`

3. Create the storage bucket `media` and keep it public for reads. Uploads go
   through the service role.
4. Create the editor account in **Authentication → Users**. Do not enable public
   sign-up: the CMS has no registration route on purpose.
5. Confirm row level security is on for every table:

```sql
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
```

Every row must show `t`. The donations, scores and fundraiser tables must have no
policy; only the service role reaches them.

## 5. Verification commands

Run these after you set the values. Replace the host with the deployment you are
testing. Production is `https://www.refifoundation.com`.

```bash
# CMS session route must refuse an anonymous read.
curl -s -o /dev/null -w '%{http_code}\n' \
  'https://www.refifoundation.com/api/cms/content?collection=stories'
# Expect: 401

# Contact form must accept a real enquiry, then deliver it.
curl -s -X POST https://www.refifoundation.com/api/contact \
  -H 'content-type: application/json' \
  -d '{"name":"Provisioning check","email":"you@example.com","message":"Provisioning test 1."}'
# Expect: 200 with {"ok":true}. Check the inbox. A 503 means Brevo is unset.

# Live feed must return data, not the not-configured message.
curl -s 'https://www.refifoundation.com/api/matches/live' | head -c 200
# Expect: "configured":true

# Payments must refuse to start only when the key is unset.
curl -s -X POST https://www.refifoundation.com/api/paystack/initialize \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","amount":500000,"currency":"NGN"}'
# Expect in test mode: {"authorizationUrl":"https://checkout.paystack.com/..."}
# Expect with no key: 503 {"error":"Payments are not configured yet."}

# Score sessions must be issued when the secret is set.
curl -s -X POST https://www.refifoundation.com/api/games/session \
  -H 'content-type: application/json' -d '{"game":"memory-match"}'
# Expect: {"configured":true,"token":"...","expiresAt":"..."}
```

## 6. Acceptance tests that must pass before launch

| Test | Pass condition |
| --- | --- |
| CMS create, publish, unpublish | A published story shows on `/stories`; an unpublished one returns 404 |
| CMS scheduled story | A story dated tomorrow is absent from `/stories` and from `sitemap.xml` |
| Contact delivery | The inbox receives the message; the API reports success only when Brevo accepted it |
| Donation, test mode | Paystack test card completes; the webhook records one row; the total rises by the paid amount |
| Duplicate webhook | Replaying the same event leaves the total unchanged |
| Wrong amount | A verified payment whose amount differs from the expected amount is refused |
| Fundraiser attribution | A donation made from a fundraiser page credits that fundraiser only |
| Score submission | A round started from `/play` appears on `/leaderboard`; a replayed submission does not create a second row |
| Match Centre | A live fixture shows live; a finished fixture does not show as live |

Record the result of each test with the date and the deployment URL. Do not mark
an integration operational until its row passes.

## 7. Rollback

Every integration fails closed. To withdraw one, delete its variable in Vercel
and redeploy. The site keeps serving from committed JSON content. It reports the
withdrawn integration as unavailable. Do not delete the Supabase tables while
they hold donation records.
