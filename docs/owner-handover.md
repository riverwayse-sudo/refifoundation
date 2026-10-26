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

The public site is fully static. It has no database and no third-party service
that must be online for pages to render. The content manager (section 3) is a
separate, optional system: the site serves its committed copy of the content and
keeps working whether or not that system is connected.

Everything here runs at **zero recurring cost**. No paid tools, subscriptions or
services are used, and none are required.

## 2. What is deliberately not live

These are not oversights. Each is blocked on something only the owner can
supply, and shipping a half-working version would be misleading to visitors.

| Item | Why it is held back | What unblocks it |
|---|---|---|
| CMS not yet connected | Built and tested, but no Supabase project has been created | Section 3 (owner action) |
| Contact form | No email service configured; there is currently no contact page at all | Section 4 |
| Online donations | `/donate` is a static page; no payment provider is connected | Section 4 |
| Sports match centre | Separate, separately-funded workstream | Not part of this brief |
| Logo | The original asset has never been supplied | Section 5 |

## 3. The CMS

The content management system lets the Foundation publish without touching
GitHub. Editors sign in at `/admin` with an email address and password, and
changes are written to a Supabase database. Publishing requests a rebuild, which
takes a minute or two.

This replaces the earlier GitHub-based editor. The GitHub OAuth app and its
`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` settings are no longer used and can be
removed from Vercel.

### Status: built and verified, but not yet connected

Everything in this section has been built and tested. What has **not** happened is
the one step only the owner can take: creating the Supabase project and adding its
settings to Vercel. Until that is done, `/admin` shows a clear "not connected"
message rather than a sign-in form that cannot work.

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

The tests can fail. This was checked deliberately by weakening a policy and by
granting a temporary permission, and confirming the suite caught both.

### What has not been verified

The sign-in flow end to end, because it needs a real Supabase project. This is the
last unproven step and it cannot be completed without the owner's project.

### Connecting it (owner action)

1. Create a project at `supabase.com` on the **Free** plan. Do not reuse any
   existing project belonging to another organisation.
2. In the project, open the SQL editor and run the contents of
   `supabase/migrations/0001_cms_schema.sql`. This creates the tables, the
   access rules, and the public `media` storage bucket for images, so there is
   no separate bucket to create.
3. Create the editor's account under Authentication, then add that user's id to
   the `cms_admins` table so the account is recognised as an administrator.
4. In Vercel, under Settings then Environment Variables, add:

   | Variable | Where to find it | Notes |
   |---|---|---|
   | `SUPABASE_URL` | Supabase, Project Settings, API | |
   | `SUPABASE_ANON_KEY` | Supabase, Project Settings, API | Public by design; safe to expose |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase, Project Settings, API | **Server only.** Never prefix with `NEXT_PUBLIC_` |
   | `VERCEL_DEPLOY_HOOK_URL` | Vercel, Settings, Git, Deploy Hooks | Create a hook for the `main` branch |
   | `CRON_SECRET` | Any long random string | Protects the keep-alive endpoint |

5. Redeploy. Then visit `/admin` and sign in.

Both `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` must be **server-only**. Do not
prefix them with `NEXT_PUBLIC_`; that would publish the secret to the browser.

### Who can edit

Only accounts listed in the `cms_admins` table. Adding or removing a row controls
who can publish. There is no public sign-up, deliberately: a public sign-up form on
a CMS would let anyone request an account.

### How publishing works

- **Save draft** stores the item without showing it on the site.
- **Publish** marks it live and asks the site to rebuild. The site updates a minute
  or two later.
- **Scheduling works.** An item with a future date stays hidden until that date
  passes. Events disappear automatically once they have been and gone.
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
  rebuild. If this becomes a frequent task, an in-app toggle is a small addition —
  it was left out deliberately rather than built without a chance to review the
  editorial rule.
- **Nothing is lost if the rebuild fails.** The content is already saved; it simply
  appears at the next deployment.

### Keeping it awake, and backups

The free plan pauses a project after seven days without use. A daily task calls
`/api/cms/cron/keep-alive` to prevent that. If the project does pause, the site
itself keeps working from its stored copy of the content, but `/admin` will be
unavailable until the project is restored in the Supabase dashboard.

The free plan has **no automatic backups**. The recovery path is:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:snapshot
```

This writes all content into the `content/` folder as plain files. Review and
commit them. That copy in Git is what would be used to restore content after an
accidental deletion, so it is worth running after any significant editing session.

### If sign-in fails

- **"Not authorised"** means the account is not listed in `cms_admins`. Add the
  user id there.
- **"Sign-in is temporarily unavailable"** usually means an environment variable is
  missing or misspelled. Check all five above, then redeploy.
- **"Too many requests"** is the rate limiter. Wait fifteen minutes.

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
| Connect the CMS | Create the Supabase project and add the five environment variables (section 3) |
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
