# REFI Foundation website — owner handover

This document is for whoever owns and runs the REFI Foundation website. It
records what exists today, what is deliberately not live, and exactly what the
owner needs to do to finish the remaining work.

Repository, CI, deployment and configuration evidence was checked on 2026-11-25. A READY deployment proves that the code was deployed; it does not prove that external integrations are operational. Where live provider or browser acceptance is still outstanding, this document says so.

- Live site: https://www.refifoundation.com
- Repository: `riverwayse-sudo/refifoundation`
- Hosting: Vercel
- Stack: Next.js 16 (App Router), React 19, TypeScript

## 1. What is live now

The following routes are on the current production release and were previously verified to return `200`:

| Page | URL | Status |
|---|---|---|
| Home | `/` | Live |
| About | `/about` | Live |
| Our Work | `/our-work` | Live |
| Impact | `/impact` | Live |
| Stories | `/stories` | Live |
| Events | `/events` | Live (empty until an event is published) |
| Get Involved | `/get-involved` | Live |
| Donate | `/donate` | Live (static — see section 4) |
| Marketing | `/marketing` | Live |

The public pages are cached with Next.js ISR. They read Supabase server-side when a cache refresh is needed, not on every visitor request, and fall back to committed JSON snapshots when the backend is unavailable or not yet provisioned. Publishing invalidates the cache so the next request refreshes the affected pages.

Everything here runs at **zero recurring cost**. No paid tools, subscriptions or
services are used, and none are required.

The following feature routes are now included in the production deployment from `main`: `/contact`, `/matches`, `/play`, `/play/[game]`, `/leaderboard`, `/fundraise`, `/fundraise/start`, `/fundraise/[slug]` and `/admin`. PR #50 (dropdown and game-input safeguards) and PR #49 (game-to-fundraiser journey) are merged. These routes are **deployed, not all operational**: provider credentials and database migrations remain outstanding. CI passed for lint, type checks, CMS/RLS tests, build, sitemap, live-feed safeguards, donation integrity and game verification. The production deployment is marked ready on commit `12eb222`.

## 2. What is deliberately not live

These are not oversights. Each is blocked on something only the owner can
supply, and shipping a half-working version would be misleading to visitors.

| Item | Why it is held back | What unblocks it |
|---|---|---|
| CMS | The CMS route is deployed, but the dedicated REFI Supabase project, schema and production credentials are not configured | Section 3 (verify project, configure and accept) |
| Contact form | Deployed, but Brevo credentials and end-to-end delivery are not configured or accepted | Section 4 |
| Online donations | Deployed, but Paystack and REFI Supabase credentials/migrations are missing; no live payment is enabled | Section 4 |
| Match Centre / Play for Impact | Deployed. Match data, persistent scores, leaderboard and fundraising activation remain blocked by missing provider credentials and REFI database provisioning | Section 4 and the provisioning checklist |
| Official logo | Assets and site integration are in draft PR #21; visual approval and merge remain outstanding | Section 5 |

## 3. The CMS

The content management system lets the Foundation publish without touching
GitHub. Editors sign in at `/admin` with an email address and password, and
changes are written to a Supabase database. Publishing invalidates the CMS data and
page caches; affected pages refresh on the next request without a full deployment.

This replaces the earlier GitHub-based editor. The GitHub OAuth app and its
`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` settings are no longer used by the new CMS and can be removed from Vercel after production acceptance.

### Status: deployed, inactive; live provisioning not verified

The CMS implementation, SQL schema and automated checks are on production `main`. The dedicated REFI Supabase project, its ownership, schema, administrator allow-list and production environment variables have not been verified from the available connected account.
Do not create another project until the owner confirms whether the REFI-specific project
created earlier is the intended CMS project. Until the credentials and migration are
verified against that project, treat /admin as not accepted for production.

### What has been verified

| Check | How it was verified | Result |
|---|---|---|
| Publishing rules | Unit tests against the rule functions, plus SQL tests against a real PostgreSQL 16 database | Pass |
| Drafts and scheduled items stay hidden | SQL tests as an anonymous visitor | Pass |
| Unverified impact figures stay hidden | SQL tests | Pass |
| Non-administrators cannot write | SQL tests as a signed-in non-admin | Pass |
| Protected endpoints reject strangers | Live requests to the running build: all returned 401 | Pass |
| The keep-alive endpoint requires its secret | Live requests with no secret, a wrong secret, and the right secret | 401, 401, 200 |
| Public pages unaffected | Every public page returns 200 with no backend configured | Pass |
| Build and type checks | `npm run build`, `npm run typecheck`, `npm run lint` | Pass |

The CMS code is deployed, but the live sign-in and publishing workflow has not been accepted because the dedicated REFI Supabase project is not available in the connected Supabase account. CI's CMS unit and RLS tests pass; those tests do not replace provisioning and end-to-end acceptance against the REFI project.

### What has not been verified

The sign-in flow end to end, because it requires verified access to the dedicated
REFI Supabase project and its approved administrator. The project reference and
credentials must be confirmed before any migration or environment change.

### Connecting it (owner action)

1. First confirm the existing REFI-specific Supabase project the owner previously connected. The connected Supabase account currently exposes no REFI project (only Valoria projects), so do not create a duplicate or use a Valoria project. If no REFI project exists, obtain owner approval before creating `refi-foundation` on the **Free** plan; confirm the region with the owner.
2. In the project, open the SQL editor and run the contents of
   `supabase/migrations/0003_cms_schema.sql`. This creates the tables, the
   access rules, and the public `media` storage bucket for images, so there is
   no separate bucket to create.
3. Create the editor's account under Authentication, then add that user's id to
   the `cms_admins` table so the account is recognised as an administrator.
4. Before enabling the production read path, import the existing JSON content
   into Supabase from a trusted local checkout. Set the project URL and service
   role key only in the local shell (never commit them), then run:

   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:import
   ```

   Verify the imported collections in the Supabase Table Editor. Do this before
   setting `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel: an empty CMS table
   is treated as intentionally empty, not as a signal to use the JSON snapshot.

5. In Vercel, under Settings then Environment Variables, add:

   | Variable | Where to find it | Notes |
   |---|---|---|
   | `SUPABASE_URL` | Supabase, Project Settings, API | |
   | `SUPABASE_ANON_KEY` | Supabase, Project Settings, API | Public by design; RLS must protect data |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase, Project Settings, API | **Server only.** Never prefix with `NEXT_PUBLIC_` |
   | `CRON_SECRET` | Generate a long random secret | Protects the keep-alive endpoint |
   | `BREVO_API_KEY` | Brevo API settings | **Server-only secret** for contact delivery |
   | `REFI_CONTACT_EMAIL` | Confirmed Foundation inbox | Contact enquiry recipient |
   | `BREVO_SENDER_EMAIL` | Verified sender in Brevo | Must be authorised in Brevo |
   | `BREVO_SENDER_NAME` | Approved display name | Optional |
   | `PAYSTACK_SECRET_KEY` | Paystack API settings | **Server-only secret** |
   | `PAYSTACK_API_BASE` | Paystack API base URL | Optional; defaults to the official API endpoint |
   | `API_FOOTBALL_KEY` | API-Football dashboard | **Server-only secret** required for live scores |
   | `FOOTBALL_API_BASE` | API-Football API endpoint | Optional; defaults to `https://v3.football.api-sports.io` |
   | `FOOTBALL_REFRESH_SECONDS` | Operator setting | Optional; defaults to 120 seconds; do not lower without checking quota |
   | `LIVE_SCORE_DAILY_BUDGET` | Operator setting | Optional; defaults to a conservative 90-request ceiling |
   | `SCORE_SESSION_SECRET` | Generate a long random secret, at least 32 characters | **Server only.** Signs the game sessions that make a score verifiable. Without it, scores stay on the device and the leaderboard stays empty |
6. Redeploy. Then visit `/admin` and sign in.

Current Vercel production environment inspection found only `NEXT_PUBLIC_SITE_URL`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. No Supabase, Brevo, Paystack, API-Football or cron credentials are currently configured. The old GitHub OAuth values can be removed after the new CMS is accepted.

Both `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` must be **server-only**. Do not
prefix them with `NEXT_PUBLIC_`; that would publish the secret to the browser.

### Who can edit

Only accounts listed in the `cms_admins` table. Adding or removing a row controls
who can publish. There is no public sign-up, deliberately: a public sign-up form on
a CMS would let anyone request an account.

### How publishing works

- **Save draft** stores the item without showing it on the site.
- **Publish** marks the item live and invalidates the tagged content and route caches.
  Affected pages refresh on the next request; no full-site deployment is created.
- **Future dates use hourly ISR.** Stories and pages stay hidden until their
  publish time, then appear on the next hourly refresh (within about an hour).
  Events are removed on the next hourly refresh after their start time. This is
  automatic, but not an exact-minute scheduler; do not promise a precise release
  second for time-critical announcements.
- **Supporting pages** created under "Other pages" are published at
  `/pages/<slug>` and included in the sitemap. The special slug `our-work`
  manages the existing `/our-work` route instead; it is not duplicated under
  `/pages/`. These pages are not automatically added to the main navigation.
- **Web addresses are fixed after creation.** This avoids accidentally creating
  duplicate published records when an existing slug is changed. To change a URL,
  create a new item with the desired slug and save the old item as a draft.
- **Image uploads** accept PNG, JPEG, WebP, AVIF and GIF files up to 4 MB. SVG
  and files whose binary signature does not match the selected image format are
  rejected.
- **Impact figures require verification.** A figure is displayed only when marked
  verified. The editor screen cannot set this, on purpose, so an unverified number
  cannot be published by saving a form. **There is currently no in-app control for
  it:** to verify a figure, an administrator sets it directly in the Supabase SQL
  editor, for example:

  ```sql
  update public.content
     set data = jsonb_set(data, '{verified}', 'true')
   where collection = 'impact_metrics'
     and slug = 'the-figure-slug';
  ```

  Setting it back to `false` withdraws the figure from the public site at the next
  hourly refresh; use the publish action for immediate cache invalidation when needed. If this becomes a frequent task, an in-app toggle is a small addition —
  it was left out deliberately rather than built without a chance to review the
  editorial rule.
- **Nothing is lost if a refresh fails.** The content is already saved; the cached
  page remains available and the next ISR refresh retries the read.

### Keeping it awake, and backups

The free plan pauses a project after seven days without use. A daily task calls
`/api/cms/cron/keep-alive` to prevent that. If the project does pause, the site
itself keeps working from its stored copy of the content, but `/admin` will be
unavailable until the project is restored in the Supabase dashboard.

The free plan has **no automatic backups**. The recovery path is:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:snapshot
```

This writes two outputs: the individual collection JSON files under `content/` contain published content only and are safe for the public site's static fallback; the full backup, `.cms-backups/cms-backup.json`, contains every CMS row including drafts. **The GitHub repository is public: never commit the full backup.** Copy it to the Foundation's approved private/encrypted storage and restrict access to authorised operators. Commit only the published JSON snapshots.

To restore all backed-up editorial records, first retrieve the backup from approved private storage and place it at `.cms-backups/cms-backup.json` in the local working copy. Confirm the target REFI Supabase project, then run:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:restore
```

Restore is a non-destructive upsert: it restores records in the backup, including their draft/published state, but does not delete rows that are absent from the backup. Run it only after confirming the target project and reviewing the backup.

### If sign-in fails

- **"Not authorised"** means the account is not listed in `cms_admins`. Add the
  user id there.
- **"Sign-in is temporarily unavailable"** usually means an environment variable is
  missing or misspelled. Check the CMS variables above, then redeploy.
- **"Too many requests"** is the rate limiter. Wait fifteen minutes.

## 4. Contact form and donations

### Contact form — implemented, awaiting production configuration

A contact page and server-side Brevo endpoint are integrated in PR #31 on the integration branch. The endpoint validates input, bounds request bodies, escapes
HTML, uses a honeypot and request timeout, and includes best-effort per-instance
throttling. That in-memory limiter is not distributed protection; configure a hard
rate limit at the hosting edge before production launch.

Before production release or announcing the form, configure `BREVO_API_KEY`, `REFI_CONTACT_EMAIL`, `BREVO_SENDER_EMAIL` and optional `BREVO_SENDER_NAME` in Vercel; test successful delivery and failure handling; and complete mobile/desktop visual review. Until those checks pass, the existing
mailto:hello@refifoundation.org fallback remains the reliable contact route.

### Donations

`/donate` and the Paystack initialization, verification and webhook code are integrated in PR #27/#30. No live payment is enabled until the REFI Supabase migrations and `PAYSTACK_SECRET_KEY` are configured, then test-mode and live-mode transactions are verified.

### Play for Impact games, scores and leaderboard

The four games are deployed at `/play` and `/play/[game]`. The game hub now links completed rounds to `/fundraise/start?game=<slug>`; the fundraiser form validates the slug against the published game catalogue before preselecting it. This journey passed CI after PR #49 and #50.

Score integrity now uses a server-issued HMAC session: `/api/games/session` signs the round start and `/api/scores` checks the token and server-measured duration. The score store also enforces one submission per session and game. This is a bounded integrity check, not a full anti-cheat system.

The public leaderboard remains intentionally inactive until the dedicated REFI Supabase project is confirmed, migrations `0001_donations.sql`, `0002_game_scores.sql`, `0003_cms_schema.sql` and `0004_fundraisers.sql` are applied in order, and `SCORE_SESSION_SECRET` plus the required Supabase server credentials are configured. Until then, a game can run locally in the browser, but the server must not claim that a score was saved or publish rankings. Fundraising totals must count only successfully verified Paystack transactions.

## 5. The logo

The official logo files and their integration into the header, footer and browser
icons are in draft PR #21. Its automated deployment check is green. The remaining
step is visual review at desktop and mobile sizes, including checking that the
emblem is not distorted or cropped, before merging. Do not replace the supplied
artwork with a recreated lookalike.

## 6. Things the owner should know before changing settings

These are recorded because they have already caused a real, hard-to-spot problem
once. Please read before touching environment variables or hosting settings.

- Do not add or change `NEXT_PUBLIC_SITE_URL`. The site deliberately ignores it
  and uses a fixed canonical host. A stale or preview-scoped value previously
  pointed the site's canonical tags at a deployment alias and got the real
  domain de-indexed by search engines. This is not a bug to fix; it is a guard.
- The deployment policy now disables feature-branch previews; only `main` and the controlled `staging` branch deploy automatically. Vercel Authentication protects the staging preview. This is a security
  feature, not a fault. To share a preview with someone outside the Vercel team,
  either invite them or generate a protection-bypass secret.
- Only `www.refifoundation.com` should be indexed. The bare domain and Vercel
  aliases are marked `noindex` on purpose.

## 7. Routine tasks

### Publishing content

Once section 3 is done: sign in at `/admin`, edit, and choose **Save draft** or
**Publish**. Publishing writes to Supabase and invalidates the CMS cache; the next request
regenerates affected pages through ISR. No GitHub pull request or deployment is
involved in the editorial workflow.

### Restoring the site if a change breaks it

Vercel keeps every deployment. In the Vercel project, go to Deployments, find
the last good one, and promote it to Production. This is the fastest safe
rollback and needs no code change.

### Checking the site is healthy

Visit https://www.refifoundation.com and confirm the pages load. The footer
should read "RAISING • EMPOWERING • TRANSFORMING LIVES."

## 8. Current open items

| Item | Owner action needed |
|---|---|
| Connect the CMS | Verify the dedicated REFI Supabase project, apply migration, configure hosting variables, and complete end-to-end acceptance (section 3) |
| Logo | Visually review and approve draft PR #21 (section 5) |
| Contact form | Configure Brevo, edge rate limiting and verify delivery (section 4) |
| Donations | Configure Paystack and REFI Supabase, apply migrations and verify test/live payment lifecycle; no live payment flow yet |
| Match Centre | Deployed at `/matches`; configure `API_FOOTBALL_KEY`, set the plan's request budget, and complete live fixture acceptance. Without the key, the API correctly reports `configured: false` rather than inventing scores |
| Branch protection | Turn on a `main` rule requiring a pull request and the `verify` check (see below) |
| Story pages in sitemap | Fixed — published stories now appear in `sitemap.xml` |

The remaining work is operational activation and acceptance: confirm the dedicated REFI Supabase project, apply the ordered migrations, configure Brevo and Paystack, test contact and payment delivery, configure API-Football, test live fixtures, and complete the game-session/leaderboard acceptance tests. The code is already deployed; do not treat that as proof that these integrations are active.

### Sitemap and indexing

`sitemap.xml` lists the main pages and every published story. Scheduled and
unpublished stories are excluded, because the sitemap is generated from the same
loader the public pages use. A story appears in the sitemap once it is published.

Indexing is deliberately asymmetric. `www.refifoundation.com` is indexable, and
that is the intended state — the site is meant to be found. The bare domain
redirects to `www`, and Vercel deployment aliases and preview URLs are marked
`noindex` on purpose, so only the canonical host competes in search results.
`/admin` is also `noindex`. Do not add a site-wide `noindex` header: that would
remove the public site from search engines, which is not wanted.

### Automatic checks on changes

Every pull request runs automated checks (`.github/workflows/ci.yml`): install
from the lockfile, lint, type check, CMS unit and RLS tests, contact/navigation
regressions, production build, sitemap, live-feed, donation and game tests. A
failing check blocks merging once branch protection is enabled. The check is
named `verify`.

### Protecting `main` (owner action)

The checks above only block a merge if GitHub is told to require them. To turn
that on: repository **Settings → Rules → Rulesets**, create a rule targeting
`main`, and set:

- Require a pull request before merging, with at least one approval
- Dismiss stale approvals when new commits are pushed
- Require conversation resolution
- Require the status check `verify`
- Block force pushes
- Block branch deletion

This does not govern editorial publishing through `/admin`: content is stored in Supabase and the publish action invalidates ISR caches. Branch protection applies to code changes only; editorial access is controlled by the `cms_admins` allow-list.

 

### Initial content import

After confirming the dedicated REFI Supabase project and applying
`supabase/migrations/0003_cms_schema.sql`, import the existing JSON content
before enabling the production `SUPABASE_URL` and `SUPABASE_ANON_KEY` settings.
Set the service-role key only in a trusted local shell, then run:

```bash
npm run cms:import
```

The import is repeatable and upserts by collection and slug; it does not delete
database rows. It seeds the current homepage content as well as any records in
the other JSON collections. Before running it against a CMS that already contains
editorial work, take a snapshot and review the rows it will update. Never place the
service-role key in a `NEXT_PUBLIC_*` variable or commit it to Git.

### Scheduled publishing limitation

The CMS uses hourly ISR revalidation for scheduled content. Future-dated stories
and pages appear on the next hourly refresh after their publish time; events are
removed on the next hourly refresh after they start. The daily keep-alive cron only
checks Supabase availability. This is not an exact-minute scheduler.

## Campaigns (Play for Impact fundraisers)

Anyone can create a campaign at `/fundraise/start`. It appears at
`/fundraise/<slug>` immediately and is listed on `/fundraise`.

- **To withdraw a campaign**, run
  `update public.fundraisers set status = 'hidden' where slug = '<slug>';`.
  Do not delete a campaign that holds donations: the row is what the totals view
  joins on.
- **To restore it**, set `status = 'active'` again.
- A campaign total is the sum of confirmed NGN donations for that slug. If you
  need a correction, correct the donation row, not the campaign: the view is the
  only source of a total.
- Campaign creation is rate limited to three per hour per address. There is no
  moderation queue, so review new campaigns when they appear.
