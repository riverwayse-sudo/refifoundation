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
npm audit
```

`npm ci` is the only supported install — the lockfile is committed and pinned.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:
install from the lockfile, lint, type check, build, then `verify:sitemap`. The
job is named **`verify`**, so the status check to require in branch protection
is `verify`.

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

## CMS (Decap, Git-based)

Content is authored in Decap at `/admin`, which commits JSON into `content/` on
`main`; Vercel then rebuilds and `src/lib/content.ts` reads that JSON at build
time. The site stays fully static and needs no runtime content service.

- **Only the editor login needs credentials.** `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET` (server-only) are required for the OAuth routes. The
  public site renders without them; `/api/cms/auth` returns 503 rather than
  crashing when they are absent.
- **The catch-all header rule must be listed first.** For a repeated header key
  the last matching rule wins, and `/:path*` also matches `/admin`. Listing the
  admin rule first silently applied the strict site CSP to `/admin` and broke
  the CMS (verified).
- **Decap needs `'unsafe-eval'`** in `script-src`: its config loader evaluates
  the YAML through a JavaScript string, and without it the admin fails with
  "Evaluating a string as JavaScript violates ... script-src". It is confined to
  `/admin`, which is noindex and behind OAuth; the public CSP must not contain it.
- **`/admin` must keep its trailing slash.** Decap resolves `config.yml`
  relative to the document URL, so serving `/admin` (slash stripped by Next)
  made it request `/config.yml` and 404. `public/admin/index.html` sets
  `rel="cms-config-url"` and `next.config.ts` rewrites `/admin` to it.
- **Editor-supplied image URLs use `<img>`, not `next/image`.** They can point
  at any host, which `next/image` would reject against the remote allowlist at
  build time.
- **CMS Markdown is rendered by `react-markdown`**, which escapes raw HTML, so
  CMS-authored content cannot inject markup. Verified: `<script>`, `onerror`
  and `javascript:` URLs are all neutralised.

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
