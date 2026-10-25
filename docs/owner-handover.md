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
| Editor login (CMS) | Needs a GitHub OAuth app | Section 3 |
| Contact form | No email service configured; there is currently no contact page at all | Section 4 |
| Online donations | `/donate` is a static page; no payment provider is connected | Section 4 |
| Sports match centre | Separate, separately-funded workstream | Not part of this brief |
| Logo | The original asset has never been supplied | Section 5 |

## 3. The CMS: what it needs from the owner

The content management system is built and works. Editors will sign in at
`https://www.refifoundation.com/admin`, and changes are committed to the
repository as content files, which triggers a rebuild. That design means the
site needs no database and no API keys to *serve* content.

**The only missing piece is the GitHub OAuth app.** Until it exists, `/admin`
shows a sign-in screen that cannot complete, and `/api/cms/auth` returns a
clear "not configured" message rather than failing silently.

### Step 1 — Create the GitHub OAuth app

1. Go to GitHub, then Settings, then Developer settings, then OAuth Apps, then
   New OAuth App.
2. Set the fields exactly as follows:

   | Field | Value |
   |---|---|
   | Application name | `REFI Foundation CMS` (any name is fine) |
   | Homepage URL | `https://www.refifoundation.com` |
   | Authorization callback URL | `https://www.refifoundation.com/api/cms/callback` |

   The callback URL must match exactly, including `https://` and the `www`.

3. Click Register application.
4. Copy the Client ID.
5. Click Generate a new client secret and copy the secret. GitHub shows it once
   only.

### Step 2 — Add the credentials to Vercel

In the Vercel project, go to Settings, then Environment Variables, and add two
variables:

| Name | Value | Environments |
|---|---|---|
| `GITHUB_CLIENT_ID` | the Client ID from step 1 | Production (and Preview if desired) |
| `GITHUB_CLIENT_SECRET` | the client secret from step 1 | Production (and Preview if desired) |

Both must be server-only. Do not prefix them with `NEXT_PUBLIC_`; that would
expose the secret to the browser.

Then redeploy so the new variables take effect.

### Step 3 — Confirm it works

1. Visit `https://www.refifoundation.com/admin`.
2. Click Login with GitHub and authorise the app.
3. You should land in the editor with the collections listed.

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
| CMS editor login | Create the GitHub OAuth app (section 3) and add two Vercel variables |
| Logo | Send the original PNG file (section 5) |
| Contact form | Choose a provider and supply credentials (section 4) |
| Donations | Choose a payment provider and supply credentials (section 4) |
| Match centre | Separately funded workstream; not started |

Nothing else is outstanding. The remaining work is configuration, not
development, with the single exception of the logo integration, which is small
once the file arrives.
