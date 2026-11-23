# AGENTS.md — REFI Foundation website

Next.js 16 (App Router, React 19, TypeScript), deployed on Vercel (production branch `main`; feature-branch previews are disabled; `staging` is the controlled preview lane).
Canonical host: `https://www.refifoundation.com` (apex 308-redirects to `www`).

## Commands

```bash
npm ci                # install from the committed lockfile
npm run lint          # ESLint 9 flat config (next lint was removed in Next 16)
npm run typecheck
npm run build
npm run verify:sitemap # builds with temp content, asserts against live server
npm run test:cms      # publishing rules, validation, docs consistency (Node built-in runner)
npm run test:rls      # row-level security against real PostgreSQL (needs Docker)
npm run cms:snapshot  # full editorial backup + public-only snapshots (needs credentials)
npm run cms:restore   # non-destructive restore from .cms-backups/cms-backup.json (needs credentials)
npm audit
```

`npm ci` is the only supported install — the lockfile is committed and pinned.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:
install from the lockfile, lint, type check, CMS unit/RLS tests, contact and
navigation regressions, build, sitemap, live-feed, donation and game verification.
The job is named **`verify`**, so the status check to require in
branch protection is `verify`.

`test:rls` runs on the GitHub runner, which has Docker, so the row-level security
policies are genuinely exercised in CI rather than skipped.

`scripts/verify-sitemap.mjs` builds with temporary content and asserts against
the running server, so it exercises the real route rather than reimplementing
the filter. It fails if a published story or supporting CMS page is missing, if
scheduled content leaks in, or if a URL is not the canonical origin. It restores
both temporary content files in a `finally` block and binds to an OS-assigned free
port so a stale server cannot be mistaken for the build under test.

Branch protection is **not yet enabled** — applying it needs a token with the
`administration` scope, which the agent's credential lacks (403 on both the
branch-protection and ruleset endpoints). This is an owner action.

## Verified constraints (do not re-litigate)

- **Canonicalisation must not read the environment.** `NEXT_PUBLIC_SITE_URL` is
  set in Vercel to a *deployment alias*. Honouring it previously pointed
  canonical/OG/sitemap/robots at a preview host and served
  `X-Robots-Tag: noindex` on the real domain. `src/lib/site.ts` holds the host
  as a constant and `src/middleware.ts` noindexes anything outside
  `indexableHosts`.
- **Nonce-based CSP is not viable here.** Middleware-generated nonces never
  reach the inline scripts Next.js writes into statically prerendered HTML
  (measured: 0 of 3). A nonce policy breaks hydration. `script-src` therefore
  needs `'unsafe-inline'`; the bundle has no `eval`/`new Function`.
- **The CSP is production-only** (`NODE_ENV === "production"`) so it cannot
  break the dev server's HMR runtime.
- **`src/app/page.tsx` previously duplicated header/footer markup** instead of
  using `SiteHeader`/`SiteFooter` from `_components/site-chrome.tsx`. That
  caused the footer to drift between pages. Use the shared components.

## CMS (Supabase + ISR content)

Content is authored at `/admin` (a first-party Next.js page) and stored in Supabase once the dedicated REFI project is provisioned; until then the public site uses committed JSON snapshots.
`src/lib/content.ts` still reads content at build time: either from Supabase using
the anon key, or from the committed JSON in `content/` when no backend is
configured or the backend is unreachable. The public site uses ISR-cached pages and keeps working from committed JSON snapshots if Supabase is paused or removed. It does not query the database for every visitor request.

Replaced the previous Decap/GitHub editor. `public/admin/` and the
`/api/cms/auth` + `/api/cms/callback` OAuth routes were deleted along with it.

- **The binding constraint is zero recurring cost.** No paid tools, subscriptions
  or services. Supabase **Free** only. Do not add dependencies to solve a problem
  that a few lines of `fetch` will solve; the PostgREST client in
  `src/lib/cms/supabase.ts` is deliberately hand-rolled for this reason.
- **Publishing rules live in one place: `src/lib/cms/visibility.ts`.** They are
  pure functions with an injectable clock, unit tested in
  `tests/visibility.test.ts`. `src/lib/content.ts` calls them rather than
  reimplementing the rules inline, so the tested code is the code that runs. The
  same rules are enforced in SQL by `public.is_content_visible()`.
- **The SQL policies are the real security boundary**, not the TypeScript.
  `supabase/tests/10_rls.sql` proves them against a real PostgreSQL instance via
  `scripts/test-rls.sh` (needs Docker). The suite is verified to *fail* when a
  policy is weakened, so a green run is meaningful.
- **Unverified impact figures must never publish.** `verified` is not accepted from
  the client at all; `validateContent` omits the field entirely so a crafted
  request cannot set it, and the content route carries the stored value forward on
  update. Do not "fix" this by accepting the field from the form.
- **`script-src` on `/admin` must not contain `'unsafe-eval'`.** The old editor
  needed it; the new one does not. Re-adding it would give away the security gain
  from replacing the CMS. The admin CSP is scoped to `/admin` only.
- **The catch-all header rule must be listed first.** For a repeated header key the
  last matching rule wins, and `/:path*` also matches `/admin`. The admin rule must
  come last in `next.config.ts`.
- **`img-src` must include `https://*.supabase.co`.** CMS-uploaded images are
  served from Supabase storage; without this the CSP blocks them on the public site
  (silently, as a broken image).
- **Editor-supplied image URLs use `<img>`, not `next/image`.** They can point at
  any host, which `next/image` would reject against the remote allowlist at build
  time.
- **SVG uploads are rejected on purpose.** SVG can carry active content. Media is
  served from the Supabase storage origin, not the REFI website origin; keeping the
  upload allow-list to raster formats still reduces the risk of unsafe active files.
  The upload route also checks file signatures rather than trusting MIME headers,
  and caps files at 4 MB to stay below the serverless request-body limit.
- **Markdown is rendered by `react-markdown`**, which escapes raw HTML, so
  CMS-authored content cannot inject markup.
- **Content destination links are validated server-side.** CTA and registration
  links may be same-site paths or HTTPS URLs; script, data and protocol-relative
  URLs are rejected.
- **CMS secrets are server-only.** `config.ts`, `supabase.ts`, `auth.ts` and the
  server-side content source import `server-only`; never move these modules into a
  client component dependency graph.
- **Saved content slugs are immutable in the editor.** Changing a slug is a
  create-new-and-unpublish-old operation; do not re-enable in-place slug editing
  without adding an atomic rename flow.
- **The free tier pauses after 7 days idle.** A daily Vercel cron calls
  `/api/cms/cron/keep-alive`, guarded by `CRON_SECRET`. Free tier also has no
  automatic backups: `npm run cms:snapshot` writes content into `content/` as the
  recovery path. Both limits are documented in `docs/owner-handover.md`.
- **Environment variable names are checked by a test.** `tests/docs-consistency.test.ts`
  fails if `docs/owner-handover.md` names a variable the code does not read, or the
  code reads one the doc does not document. This caught a real environment-name mismatch. The selected ISR publishing
  architecture does not require a Vercel deploy hook.


- **Never use Valoria's Supabase project for REFI.** The dedicated REFI project is
  not visible in the currently connected Supabase organisation. Confirm the
  previously connected REFI project with the owner before creating anything.
- **Migration versions are sequential across features.** Donations are
  `0001_donations.sql`, game scores are `0002_game_scores.sql`, and CMS is
  `0003_cms_schema.sql`. Never introduce duplicate migration version prefixes.
- **The public leaderboard is intentionally empty.** Browser-submitted scores are
  validated but not stored because there is no server-issued game session proving
  a score is genuine. Do not persist or rank client-reported scores until that
  integrity mechanism exists.
- **No production release without explicit owner approval.** Work on feature
  branches and verify CI first; do not merge the release branch into `main` or
  trigger a production deployment without approval.

### Testing without adding a framework

`npm run test:cms` uses Node 24's built-in test runner with native TypeScript
support, so no test framework is installed. Node requires explicit file extensions
on relative imports in this mode, which is why `tsconfig.json` sets
`allowImportingTsExtensions`. Tests target pure modules with no runtime relative
dependencies and no JSON imports; importing the full `src/lib/content.ts` loader
would pull in the app's extensionless imports, which plain Node cannot resolve
outside the Next.js bundler.

## Verification expectations

Build success is not sufficient evidence. After any user-visible change,
confirm the **deployed** site: fetch the live URL, check the rendered HTML and
response headers, and load it in a browser to confirm hydration and client-side
navigation still work.

## Free-only technology policy

REFI must remain operable on free tiers and open-source software. Do not add
paid subscriptions, paid APIs, premium hosting features, or dependencies that
require a licence fee. Do not silently upgrade any provider plan. If a free
quota is exhausted, show an honest unavailable/stale state and resume when the
quota resets; never trigger paid usage to keep a feature online.

- API-Football is permitted only on its **$0 Free plan** (currently 100
  requests/day, no payment card required, and the provider says requests stop
  when the quota is reached rather than generating overage charges). Do not
  upgrade it. The live feed must tolerate quota exhaustion.
- Hosting, database, CI, email and analytics must remain within free allowances.
  Reassess the current provider's published limits before enabling any service.
- Paystack is a payment processor, not a subscription dependency: transaction
  fees apply only when a donor chooses to make a payment. Do not add paid
  recurring services around donations.
- Prefer existing platform capabilities and browser-native code over new
  packages. Every proposed dependency must be open-source and free to use.

## Live football feed (PR #22 branch)

`/matches` renders a live-score feed backed by API-Football. The provider's free
tier is metered per day, so the feed is built around not spending requests
carelessly. Do not undo any of the following:

- **No short `revalidate` on the route.** `revalidate = 30` is 2,880 requests a
  day on its own, which exhausts a free-tier allowance within the first hour of
  a match day. The upstream call is cached for `REFRESH_SECONDS` (120) in
  `src/lib/football/live.ts`, and the route response is cacheable for the same
  window, so many visitors and repeated polls share one provider request.
- **The daily ceiling comes from the provider, not a guess.** `live.ts` reads
  `x-ratelimit-requests-limit` / `-current` from the provider's response headers
  and applies a 0.9 safety margin. Do not replace this with a hardcoded number:
  the real limit depends on the account plan, which is an owner-side fact.
  `LIVE_SCORE_DAILY_BUDGET` overrides it when an operator sets it explicitly,
  and takes precedence over the reported value.
- **Single-flight is load-bearing.** `fetchLiveMatches()` shares one in-flight
  promise, so concurrent cache misses collapse into one upstream call. Removing
  it lets a traffic burst stampede the provider.
- **There are no automatic retries.** A failure must not spend more of the
  remaining allowance. A `429` is treated as definitive and marks the rest of
  the day as spent instead of probing again.
- **The client poll interval is not the cost driver.** Polling re-reads a cached
  feed, so `POLL_MS` can stay short without costing provider requests. Polling
  also pauses while the tab is hidden.
- **Test with `npm run verify:live-feed`, never the real provider.**
  `FOOTBALL_API_BASE` points the feed at a local mock, and
  `FOOTBALL_REFRESH_SECONDS` lowers the cache window so the budget guard can be
  exercised deterministically. Both exist for testing only.

## Vercel

Only `main` and the controlled `staging` branch deploy automatically; feature
branches run GitHub CI without creating Vercel previews. Staging is protected by
Vercel Authentication (SSO), so visual acceptance needs an authorised Vercel
session or a protection-bypass secret. The connected Vercel project can be
inspected, but secret values must be supplied and configured by the owner.
Never ask for secrets in chat.

## Deferred / out of scope

- **Logo**: PR #21 holds derived assets built from the supplied attachment,
  but it is not merged. Obtain visual approval or the original file before
  merging; do not recreate or substitute the mark.
- **Match Centre** is implemented at `/matches` using API-Football and is
  deployed. Keep the provider cache, single-flight request guard,
  provider-derived daily budget, no-retry-on-quota behaviour and the
  mock-based `npm run verify:live-feed` test. Until `API_FOOTBALL_KEY` is set,
  `/api/matches/live` answers 503 with `configured: false`. Keep that honest
  failure; never show fabricated scores.
- **Play for Impact** lives at `/play`; each game is served by `/play/[game]`.
  The game catalog is the single source of truth. A score is not a donation,
  reward or prize. Browser-reported scores are not authoritative and must not
  be published to a leaderboard until a server-issued session can validate
  them.
- **Payments must be verified server-side.** Never trust a success URL or event
  body as proof of payment. Verify amount and currency with Paystack, validate
  the raw-body webhook signature, re-verify the transaction, and use the unique
  payment reference for idempotency. Storage failure must never be reported as
  a recorded donation. Run `npm run verify:donations` and
  `npm run verify:games` against their local mocks.
- **Donation storage migration** (`supabase/migrations/0001_donations.sql`)
  is version-controlled but not automatically applied. Until an owner applies
  it and supplies the required Paystack/Supabase server credentials, donation
  totals remain unavailable; do not invent totals or claim successful storage.
- **Game score migration** is also not applied. Do not enable public score
  persistence without server-issued session validation.
- **Contact delivery** needs `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and
  `REFI_CONTACT_EMAIL`. Without them `/api/contact` answers 503 and names the
  fallback mailbox. Never report success unless Brevo accepted the message.
- **The mobile navigation is the only route to interior pages below 800px**;
  `.refi-nav-links` is hidden there. Do not remove `MobileNavigation` from
  `SiteHeader` without replacing it.


## Technical communication — ASD-STE100

Use the project communication policy in `docs/engineering/ASD-STE100.md` for
engineering documentation, operational procedures, test evidence, pull
requests, defect reports, and user-facing technical instructions.

The policy references ASD-STE100 Issue 9 (15 January 2025). It is a project
writing policy, not a claim of formal ASD-STE100 compliance. For formal
compliance reviews, use the complete current official ASD-STE100 Part 1 rules
and Part 2 dictionary. Do not reproduce the protected standard in this
repository.

Keep technical terms, identifiers, API contracts, security requirements, and
meaningful implementation detail intact. Do not simplify text in a way that
changes system behavior or removes a required warning.
