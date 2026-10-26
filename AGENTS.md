# AGENTS.md — REFI Foundation website

Next.js 16 (App Router, React 19, TypeScript), deployed on Vercel.
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
npm run cms:snapshot  # write published content into content/ (needs Supabase credentials)
npm audit
```

`npm ci` is the only supported install — the lockfile is committed and pinned.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:
install from the lockfile, lint, type check, `test:cms`, `test:rls`, build, then
`verify:sitemap`. The job is named **`verify`**, so the status check to require in
branch protection is `verify`.

`test:rls` runs on the GitHub runner, which has Docker, so the row-level security
policies are genuinely exercised in CI rather than skipped.

`scripts/verify-sitemap.mjs` builds with temporary content and asserts against
the running server, so it exercises the real route rather than reimplementing
the filter. It fails if a published story is missing, a scheduled story leaks
in, or a URL is not the canonical origin, and it restores `content/stories.json`
in a `finally` block. It binds to an OS-assigned free port so a stale server on
a fixed port cannot be mistaken for the build under test.

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

## CMS (Supabase + build-time content)

Content is authored at `/admin` (a first-party Next.js page) and stored in Supabase.
`src/lib/content.ts` still reads content at build time: either from Supabase using
the anon key, or from the committed JSON in `content/` when no backend is
configured or the backend is unreachable. The public site therefore stays static
and keeps working even if Supabase is paused or removed.

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
- **SVG uploads are rejected on purpose.** SVG can carry scripts and is served from
  the site's own origin, so allowing it would make image upload a stored XSS
  vector. Raster formats only.
- **Markdown is rendered by `react-markdown`**, which escapes raw HTML, so
  CMS-authored content cannot inject markup.
- **The free tier pauses after 7 days idle.** A daily Vercel cron calls
  `/api/cms/cron/keep-alive`, guarded by `CRON_SECRET`. Free tier also has no
  automatic backups: `npm run cms:snapshot` writes content into `content/` as the
  recovery path. Both limits are documented in `docs/owner-handover.md`.
- **Environment variable names are checked by a test.** `tests/docs-consistency.test.ts`
  fails if `docs/owner-handover.md` names a variable the code does not read, or the
  code reads one the doc does not document. This caught a real
  `CMS_DEPLOY_HOOK_URL` vs `VERCEL_DEPLOY_HOOK_URL` mismatch.

### Testing without adding a framework

`npm run test:cms` uses Node 24's built-in test runner with native TypeScript
support, so no test framework is installed. Node requires explicit file extensions
on relative imports in this mode, which is why `tsconfig.json` sets
`allowImportingTsExtensions`. Tests import modules with **no relative imports and
no JSON imports**; a test that pulls in `src/lib/content.ts` fails under plain Node
because the app's extensionless imports cannot be resolved outside the bundler.
That is why the publishing rules were extracted into their own dependency-free
module rather than tested through the loader.

## Verification expectations

Build success is not sufficient evidence. After any user-visible change,
confirm the **deployed** site: fetch the live URL, check the rendered HTML and
response headers, and load it in a browser to confirm hydration and client-side
navigation still work.

## Vercel

Preview deployments sit behind Vercel Authentication (SSO), so previews cannot
be inspected without a protection-bypass secret. Verify against production, or
ask the owner for a bypass secret. The owner must change environment variables
— the agent has no Vercel project access.

## Deferred / out of scope

- **Logo**: the original asset is not in the repository. Do not recreate or
  substitute it. Work is blocked until the client supplies the file.
- **Sports match centre** (`feat/cms-live-match-foundation`): deferred.
- **Contact form and donations** (`/donate` is a static page): blocked on
  credentials (Brevo, Paystack). Do not ship forms that cannot deliver.
- **The mobile navigation is the only route to interior pages below 800px**;
  `.refi-nav-links` is hidden there. Do not remove `MobileNavigation` from
  `SiteHeader` without replacing it.
