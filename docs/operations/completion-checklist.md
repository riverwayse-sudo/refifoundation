# Completion checklist

This page records the state of each area of the REFI platform. It separates two
things that are easy to confuse:

- **Deployed**: the code is on production and answers requests.
- **Operational**: a real user or donor can complete the task against the live
  service, and the result was verified.

An area can be deployed and not operational. That is the normal state while a
credential or a migration is missing. The route answers with a refusal, and the
refusal is correct.

Last updated: 2026-11-23. Update the date when you change a row.

## State of each area

| Area | State | Evidence | What is missing |
| --- | --- | --- | --- |
| Public pages and navigation | **Operational** | Every route returns 200 with the correct canonical host; mobile navigation works below 800px | None |
| Stories, projects, events, impact | **Operational** | Rendered from committed JSON; listing and detail pages work | None |
| Scheduled publishing from JSON | **Operational** | A story dated in the future is absent from the listing and from `sitemap.xml` | None |
| SEO, canonicals, sitemap | **Operational** | `npm run verify:sitemap` passes; 20 URLs; non-canonical hosts are noindexed | None |
| Contact form | **Deployed, inactive** | `POST /api/contact` answers 503 and names the fallback mailbox | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `REFI_CONTACT_EMAIL`, `BREVO_SENDER_NAME` |
| CMS (Supabase) | **Deployed, inactive** | `/admin` loads; `/api/cms/content` answers 401; sign-in reports that Supabase is not provisioned | Supabase project, `0003_cms_schema.sql`, `SUPABASE_*` values, one editor account |
| Donations (Paystack) | **Deployed, inactive** | `/api/paystack/initialize` answers 503 without a key and 400 on bad input; the success page never claims a payment succeeded | `PAYSTACK_SECRET_KEY`, `0001_donations.sql` |
| Fundraise campaigns | **Deployed, inactive** | `/fundraise` renders; the API reports storage is not configured; an unknown campaign is refused before checkout | `0004_fundraisers.sql` plus the Supabase values |
| Game scores and leaderboard | **Deployed, inactive** | `/api/games/session` answers 503 `configured:false`; `/api/scores` validates and refuses to store; `/leaderboard` states that rankings are not enabled | `SCORE_SESSION_SECRET` (32+ chars), `0002_game_scores.sql` |
| Match Centre | **Deployed, inactive** | `/api/matches/live` answers 503 `configured:false`; `/matches` shows the unavailable message | `API_FOOTBALL_KEY`, `LIVE_SCORE_DAILY_BUDGET` |
| CI (`verify`) | **Operational** | Install from the lockfile, lint, type check, build, sitemap, live feed, donations, games and contact checks pass on every PR | Branch protection is not enabled; this is an owner action |
| Accessibility | **Operational (tested, not certified)** | One `h1` per page, `lang="en"`, every image has `alt`, labelled form fields, visible focus | No formal WCAG 2.2 AA audit has been done. Do not claim compliance |
| Performance | **Operational** | Pages are static or ISR; no client component on a content page; page weight is under 50 KB of HTML | None |

## Owner actions, in order

1. Create a Supabase project. Apply migrations `0001`, `0002`, `0003` and `0004`
   in order. Create the `media` bucket. Create one editor account.
2. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
   Vercel, Production and Preview scopes.
3. Set `SCORE_SESSION_SECRET` to at least 32 random characters.
4. Set the four Brevo values. Send one test enquiry and confirm it arrives.
5. Create a Paystack account if needed. Set `PAYSTACK_SECRET_KEY` to the **test**
   key in the Preview scope. Run the donation acceptance tests in
   `docs/operations/provisioning-checklist.md`.
6. Set the **live** Paystack key in the Production scope only after step 5 passes.
7. Set `API_FOOTBALL_KEY` and `LIVE_SCORE_DAILY_BUDGET` to the plan values.
8. Set `CRON_SECRET` and confirm the Vercel cron jobs in `vercel.json` are
   enabled on the current plan.
9. Enable branch protection on `main` with the `verify` check required. This
   needs a token with the `administration` scope.
10. Approve or reject the logo in PR #21. Do not recreate the mark.

## What this programme changed

| Change | Why | PR |
| --- | --- | --- |
| `docs/operations/provisioning-checklist.md` | A checklist that turns each refusal into a working integration | #45 |
| Server-issued game sessions, persistent scores, real leaderboard | A score from a browser is a claim; a signed session and a server-measured duration bound the claim, and the store accepts each round once | #46 |
| Play for Impact campaigns with donation attribution | Fundraising needs a campaign total that is a sum of confirmed payments, not a figure typed by anyone | #47 |
| This checklist and the AGENTS.md update | Records deployed versus operational so "merged" is not read as "working" | #48 |

## Remaining risks

| Risk | Level | Note |
| --- | --- | --- |
| No production credentials, so no integration has been exercised live | **High** | Every acceptance row above is unverified against the real provider until the owner completes the actions |
| Campaign creation is open to the public | **Medium** | Bounded by a per-address rate limit and field validation. There is no moderation queue; the owner hides a campaign with `status = 'hidden'` |
| Game scores bound a claim, not honesty | **Medium** | The server knows when a round started and which game it was. A determined client can still submit a score inside the bounds |
| Donation totals depend on webhook delivery | **Medium** | A missed webhook leaves a paid donation unrecorded until Paystack resends. Reconcile references in the Paystack dashboard |
| No branch protection | **Medium** | A direct push to `main` would skip `verify` |
| Contact form has no CAPTCHA | **Low** | Rate limited server-side; the recipient mailbox is the backstop |
