# AGENTS.md — REFI Foundation website

Next.js 16 (App Router, React 19, TypeScript), deployed on Vercel.
Canonical host: `https://www.refifoundation.com` (apex 308-redirects to `www`).

## Commands

```bash
npm ci          # install from the committed lockfile
npm run lint    # ESLint 9 flat config (next lint was removed in Next 16)
npm run typecheck
npm run build
npm audit
```

`npm ci` is the only supported install — the lockfile is committed and pinned.

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
- **CMS** and **contact/donations**: blocked on credentials (GitHub OAuth app,
  Brevo, Paystack). Do not ship forms that cannot deliver.
