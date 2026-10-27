# REFI Foundation website — owner handover

This document is for whoever owns and runs the REFI Foundation website. It
records what exists today, what is deliberately not live, and exactly what the
owner needs to do to finish the remaining work.

Everything below was verified against the repository and the live site. Where
something is unverified or blocked, it says so.

- Live site: https://www.refifoundation.com
- Repository: `riverwayse-sudo/refifoundation`
- Hosting: Vercel
- Stack: Next.js 16 (App Router), React 19, TypeScript

## 1. What is live now

All of these return `200` on production:

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

The site is fully static. It has no database, no runtime content service, and
no third-party service that must be online for pages to render.

## 2. What is deliberately not live

These are not oversights. Each is blocked on something only the owner can
supply, and shipping a half-working version would be misleading to visitors.

| Item | Why it is held back | What unblocks it |
|---|---|---|
| CMS sign-in test | Pipeline verified, but no one has signed in through the browser yet | Section 3 |
| Contact form | No email service configured; there is currently no contact page at all | Section 4 |
| Online donations | `/donate` is a static page; no payment provider is connected | Section 4 |
| Sports match centre | Separate, separately-funded workstream | Not part of this brief |
| Logo | The original asset has never been supplied | Section 5 |

## 3. The CMS

The content management system is built, deployed and connected. Editors sign in
at `https://www.refifoundation.com/admin`, and changes are committed to the
repository as content files, which triggers a rebuild. That design means the
site needs no database and no API keys to *serve* content.

**The GitHub OAuth app is already created and the credentials are already set in
Vercel.** This was verified against the live site: `/api/cms/auth` responds by
redirecting to GitHub's authorise page with a real client ID, and the "Login
with GitHub" button in `/admin` opens that flow correctly.

### What has been verified, and what has not

The **publishing pipeline is verified end to end** against production. A story
was committed to `content/stories.json` exactly as the CMS writes it, and:

- Vercel built and deployed the commit automatically;
- the story appeared on `/stories` and at its own detail page;
- its Markdown rendered as real HTML (headings, bold, lists, links);
- a second story dated in the future stayed hidden, on the listing and as a
  detail page, until its publish date;
- the test story was then removed and the site returned to its previous state.

What has **not** been verified is the sign-in itself: the browser popup
handshake between `/admin` and GitHub, and the editor screens behind it. That
needs a real GitHub account with write access, so it must be done by someone on
the Foundation's side. It is the last unproven step.

### Confirming the CMS works end to end

1. Visit `https://www.refifoundation.com/admin`.
2. Click **Login with GitHub** and authorise the app.
3. You should land in the editor with the collections listed.
4. Create a test story, save it, and publish it.
5. Confirm the story appears on `https://www.refifoundation.com/stories` after
   the rebuild completes (a minute or two).

If any step fails, the most likely cause is that the signed-in GitHub account
does not have write access to the repository. See "Who can edit" below.

### If the OAuth app ever needs to be recreated

The existing app is registered under the Foundation's GitHub account. Should it
ever need rebuilding, use exactly these values:

| Field | Value |
|---|---|
| Homepage URL | `https://www.refifoundation.com` |
| Authorization callback URL | `https://www.refifoundation.com/api/cms/callback` |

The callback URL must match exactly, including `https://` and the `www`. Then
set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the Vercel project under
Settings, then Environment Variables, and redeploy.

Both variables must be **server-only**. Do not prefix them with `NEXT_PUBLIC_`;
that would expose the secret to the browser.

### Who can edit

The OAuth app grants access to anyone who can sign in and has write access to
`riverwayse-sudo/refifoundation`. To control who can publish, control who is a
collaborator on the repository. There is no separate user list inside the CMS.

### How publishing works

- Saving a draft creates a pull request (editorial workflow is enabled), so
  nothing goes live until it is approved and merged.
- Merging triggers a Vercel rebuild. The site updates a minute or two later.
- Scheduling works: a story with a future publish date stays hidden until that
  date passes.
- Impact figures require explicit verification. A figure is only displayed if an
  editor ticks "verified". This is deliberate, so the Foundation does not
  publish unverified numbers.

## 4. Contact form and donations

Neither is implemented. This is intentional: a form that silently discards
enquiries, or a donate button that cannot take payment, is worse than no form.

There is currently no contact page. The footer and Get Involved page link to
`mailto:hello@refifoundation.org`, which works today.

To add a real contact form or donations, the owner needs to choose and fund a
provider, then supply its credentials. Nothing is pre-wired for a specific
provider, so there is no hidden dependency to remove.

## 5. The logo

The official logo has never been supplied. The site currently uses a simple text
mark (an "R" plus "REFI FOUNDATION") in the header and footer.

The original artwork file is not in the repository, and it must not be
recreated, redrawn, or substituted with a lookalike. An approximated logo would
be worse than none. To finish this, send the original PNG file. Once it is
available the work is small: place it in the header and footer, and generate the
browser and mobile icons from it.

## 6. Things the owner should know before changing settings

These are recorded because they have already caused a real, hard-to-spot problem
once. Please read before touching environment variables or hosting settings.

- Do not add or change `NEXT_PUBLIC_SITE_URL`. The site deliberately ignores it
  and uses a fixed canonical host. A stale or preview-scoped value previously
  pointed the site's canonical tags at a deployment alias and got the real
  domain de-indexed by search engines. This is not a bug to fix; it is a guard.
- Preview deployments are private. Vercel Authentication is enabled for
  previews, so a preview URL asks you to sign in to Vercel. This is a security
  feature, not a fault. To share a preview with someone outside the Vercel team,
  either invite them or generate a protection-bypass secret.
- Only `www.refifoundation.com` should be indexed. The bare domain and Vercel
  aliases are marked `noindex` on purpose.

## 7. Routine tasks

### Publishing content

Once section 3 is done: sign in at `/admin`, edit, save. Drafts become pull
requests; merging publishes.

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
| CMS sign-in test | Sign in at `/admin` with a write-access GitHub account and publish a test story (section 3) |
| Logo | Send the original PNG file (section 5) |
| Contact form | Choose a provider and supply credentials (section 4) |
| Donations | Choose a payment provider and supply credentials (section 4) |
| Match centre | Separately funded workstream; not started |
| Branch protection | Turn on a `main` rule requiring a pull request and the `verify` check (see below) |
| Story pages in sitemap | Fixed — published stories now appear in `sitemap.xml` |

The remaining work is mostly configuration rather than development: confirming
the CMS works end to end, supplying the logo, and choosing contact and donation
providers. The logo integration is small once the file arrives.

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
from the lockfile, lint, type check, production build, and a sitemap test. A
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

This does not conflict with the CMS. Drafts are committed to a `cms/*` branch and
opened as a pull request, so normal publishing already goes through a pull
request. Requiring one changes nothing about how content is written.
