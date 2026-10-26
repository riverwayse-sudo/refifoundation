# REFI CMS migration — architecture plan and decision record

**Status:** awaiting approval. No implementation has started.

**Branch:** `docs/cms-migration-plan` (planning only)

This document answers section 10's "before implementation" requirement: proposed
architecture, costs, migration plan, and blockers.

---

## 1. What the current system actually is

Findings from inspecting `main` at `1281ae1`.

### Content is build-time static JSON

`src/lib/content.ts` imports the JSON files directly:

```ts
import storyData from "../../content/stories.json";
```

There is no runtime data fetch anywhere in `src/lib` or the public pages. Content
is read at **build time** and baked into prerendered HTML. `sitemap.xml` and
`/stories/[slug]` are generated from the same build-time import.

This is the single most important fact in this document. It means "publish
without a rebuild" is not a matter of swapping an admin screen — the public site
has no runtime data layer at all, so publishing without a rebuild requires
**building one**.

### Content volume is near-zero

| File | Size | Contents |
|---|---|---|
| `home.json` | 701 B | The only file with real content |
| `stories.json` | 20 B | `{"stories": []}` |
| `pages.json` | 18 B | `{"pages": []}` |
| `projects.json` | 21 B | `{"projects": []}` |
| `events.json` | 19 B | `{"events": []}` |
| `impact-metrics.json` | 20 B | `{"metrics": []}` |

There is **no production content to migrate** beyond one homepage document.
Backups are still taken (section 5), but the migration risk is far lower than the
brief assumes.

### GitHub is the only auth path

`/api/cms/auth` redirects to `github.com/login/oauth/authorize` with
`scope=public_repo`. `/api/cms/callback` exchanges the code for a token and
postMessages it into the Decap popup. Decap then commits content JSON to the
repository via the GitHub API, and Vercel rebuilds.

Both endpoints are correctly written (state cookie, no-store, popup-safe CSP).
The problem is the design, not the code: the client needs a GitHub account with
write access to a public repository.

### No backend exists

- No Supabase project, credentials, or dependency anywhere in the repository or
  on any branch (the only "Supabase" reference is a stale line in `README.md`).
- `package.json` has no database, auth, or storage client.
- Only two environment variables are referenced: `GITHUB_CLIENT_ID` and
  `GITHUB_CLIENT_SECRET`.
- The agent has **no Vercel project access** (no `.vercel` link), so it cannot
  read or set environment variables.

### A previous attempt exists

PR #4 replaced Sanity with Decap, explicitly to remove "an external hosted
project" and "a time-limited/free-tier dependency." The brief now asks to
reintroduce exactly that class of dependency. This is not a reason to refuse —
it is a decision the owner should make knowingly, because PR #4's stated
rationale was the opposite of this brief's direction.

---

## 2. The central architectural decision

Requirement 3.6 forbids "rebuilding the entire website for every content
update." Requirement 3.3 forbids "editing JSON files... committing content
through GitHub."

Today the site is **fully static**: `next build` prerenders everything. If
content moves to a runtime backend, the public pages must stop being purely
build-time. There are only three ways to do that, and they differ enormously in
cost and risk.

### Option A — Runtime reads with caching (recommended)

Public pages read content from the backend at request time, wrapped in Next.js
caching with tag-based revalidation. Publishing calls `revalidateTag` so the
change appears in seconds without a full rebuild.

- **Client experience:** publish → live in seconds. Meets 5.7 and 3.6.
- **Risk:** public pages become dynamic or ISR-cached. This is the largest change
  to the existing architecture. Static generation, `generateStaticParams`, and
  `dynamicParams = false` on `/stories/[slug]` must all be reworked.
- **SEO:** unaffected in practice if caching is configured so crawlers receive
  fully rendered HTML — which they do with ISR.

### Option B — Keep build-time reads, publish via deploy hook

Content is stored in the backend, but the public site keeps reading it at build
time. Publishing triggers a Vercel deploy hook, which rebuilds the site.

- **Client experience:** publish → live in ~1–2 minutes. No developer involved.
- **Risk:** low. The public site is untouched; only the admin and the content
  source change.
- **Conflict:** this is a full rebuild per update, so it **violates the letter of
  3.6**. But it satisfies the brief's actual intent (client publishes
  independently, no GitHub) at a fraction of the risk.
- **Cost:** more build minutes; negligible on the free tier at this content volume.

### Option C — Hybrid

Static for stable content (homepage copy, impact metrics), runtime for
frequently-updated content (stories, events). More complex; two mental models to
maintain.

### Recommendation

**Option A**, because 3.6 is explicit and the client's core complaint is
slow/blocked publishing. But this must be an owner decision, because Option A
trades architectural simplicity for publishing speed, and the site is currently
commendably simple.

If the owner prefers minimum risk over seconds-fast publishing, **Option B is a
legitimate reading of the brief** and I would recommend it instead. The wording
of 3.6 is the only thing ruling it out.

---

## 3. Proposed stack

Consistent with 3.3 (inspect for existing infrastructure first): **none exists**,
so this is a proposal, not a discovery.

| Concern | Proposal | Why |
|---|---|---|
| Database | Supabase Postgres | Postgres + row-level security directly satisfies 6.2 |
| Auth | Supabase Auth (email + password) | Built-in password reset and sessions; no GitHub |
| Media | Supabase Storage | Server-side validation; public-read bucket for published assets |
| Hosting | Existing Vercel project | Already in place; no change |
| Framework | Existing Next.js 16.4.3 | No change |

Supabase is the natural fit: it is the stack the project's own `README.md` names,
it provides all three concerns in one service with a usable free tier, and its
row-level security model maps directly onto requirements 6.2 and 6.10.

**Explicitly a separate project.** Requirement 1.7 forbids reusing Valoria
Institute's Supabase project. A new, REFI-specific Supabase organisation/project
would be required. I have no access to any existing project and will not request
one.

### Cost

| Item | Free tier | Paid |
|---|---|---|
| Supabase Free | 500 MB database, 1 GB storage, 50k MAU, pauses after 7 days inactivity | Pro $25/month removes pausing |
| Vercel | Current plan unchanged | Build minutes only |

**The important cost risk is the free-tier pause.** A Supabase free project
pauses after 7 days with no activity. For a low-traffic foundation site, that
could mean the client opens the dashboard to a sleeping project. Mitigations: a
scheduled keep-alive ping, or the Pro plan.

I will not create any billable resource. This needs the owner's decision on free
vs. paid before I write a line of backend code.

---

## 4. Blockers requiring owner action

These cannot be resolved by me, and three of them gate the work:

1. **Backend authorisation and cost decision.** Create the REFI Supabase project
   (or authorise me to, if I'm given access), and decide free vs. Pro. Blocking.
2. **Environment variables in Vercel.** I have no Vercel access, so I cannot set
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or the server-only service-role key.
   Blocking for deployment (I can develop and test locally with values supplied
   out-of-band, without printing them).
3. **Architecture choice** (Option A vs. B). Blocking, as it determines the
   public-site rework.
4. **Initial administrator.** Requirement 4.4 forbids public self-registration, so
   the first admin needs creating via a one-time server-side script or the
   Supabase dashboard. The owner must supply the client's email address — **not**
   a password; the client should set their own via the reset flow.
5. **Staging acceptance.** Requirement 9 requires testing against production
   architecture. Preview deployments are behind Vercel SSO, so either a
   protection-bypass secret is needed or acceptance happens on a temporary
   production path. Owner decision.
6. **Supabase Storage and the CSP.** The public CSP is `img-src 'self' data:
   https://images.pexels.com`. Serving images from Supabase Storage requires
   adding that hostname. This is a deliberate security-header change, not an
   incidental one, and I will list it explicitly in the PR rather than slipping
   it in.

---

## 5. Content backup

Taken before any migration, per section 2.

```
tree: 21e9226a6c84bc5599a9ca032158cd6b1b92c93a
sha256:
  1a46c0402c164e450fc729a327a7f36d64cf4e4425fc9fd7063a788623706f19  content/events.json
  b5fb7b31962882d6af76e6df988f4ac5fabf4719dd61108c739f4fc9e7c4e781  content/home.json
  2a8103d59a846b279e58c6473a187df89a422170b870e318ac5317e0330f8f39  content/impact-metrics.json
  e29bb36c9dde51004dee96fe1944658ce0ec48c6be40c9b8de1f7e8f3751949e  content/pages.json
  e25019622c211b22a6c905072397c051b71f680107344f9783ecadde1c7177bc  content/projects.json
  ac1eb731f91f41d33a1902462f822114eeaba4a5350a0c990b3b36546b5c983c  content/stories.json
```

The JSON files remain in git history permanently, so the backup is recoverable
independently of this branch. Requirement 7.5 says not to delete the old
implementation until the replacement passes acceptance; I will leave
`content/`, Decap, and the OAuth routes in place until then.

---

## 6. Content schema

Derived from `public/admin/config.yml` and `src/lib/content.ts`. This is the
contract the new dashboard must preserve.

| Collection | Fields |
|---|---|
| Homepage (singleton) | `heroEyebrow`, `heroTitle`, `heroDescription`, `primaryCtaLabel`, `primaryCtaUrl`, `secondaryCtaLabel`, `secondaryCtaUrl`, `introHeading`, `introBody`, `heroImageUrl` |
| Stories (list) | `title`, `slug`, `excerpt`, `category` (enum), `coverImageUrl`, `body` (Markdown), `publishedAt` |
| Projects (list) | `title`, `slug`, `summary`, `focusArea` (enum), `status` (enum), `coverImageUrl` |
| Events (list) | `title`, `slug`, `startsAt`, `endsAt`, `location`, `summary`, `registrationUrl`, `coverImageUrl`, `status` (enum) |
| Impact metrics (list) | `label`, `value`, `context`, `sortOrder`, `verified` (bool) |
| Pages (list) | `title`, `slug`, `summary`, `heroImageUrl`, `seoTitle`, `seoDescription`, `body` (Markdown), `publishedAt`, `published` (bool) |

### Publishing rules encoded in the loaders

These must be preserved exactly; they are behaviour, not formatting:

- **Stories:** hidden until `publishedAt` is in the past.
- **Events:** must have `status === "Published"` **and** `startsAt` in the future.
- **Impact metrics:** only published when `verified === true`.
- **Pages:** require `published === true` and `publishedAt` not in the future.

Any new backend must enforce these **server-side and in row-level security**, not
just in the UI, or drafts leak (requirement 6.10).

---

## 7. Migration plan

Phased, with the existing site untouched until each phase is verified.

1. **Plan and approval** — this document. No code.
2. **Backend provisioning** — owner creates the Supabase project; schema and RLS
   policies written as versioned SQL in `supabase/migrations/`.
3. **Auth** — email/password sign-in, reset, session, logout, admin allow-list.
4. **Content API** — server-side routes for CRUD with validation, enforcing the
   publishing rules above.
5. **Dashboard** — branded UI at `/admin/` replacing Decap, matching the existing
   design tokens.
6. **Content import** — a one-time script to load the six JSON files into the
   database. Idempotent, so it can be re-run.
7. **Public-site switch** — per the chosen option. Last, and reversible.
8. **Verification** — the section 8 test list, plus a live publish/unpublish test.
9. **Decap removal** — only after acceptance. Removes `public/admin`, the OAuth
   routes, and the `/admin` CSP exception (`unsafe-eval`), which is a security
   improvement worth calling out.

---

## 8. What I will not do

- Create billable infrastructure without authorisation (1.6).
- Reuse Valoria Institute's Supabase project or credentials (1.7).
- Hard-code passwords or expose service-role keys client-side (4.6).
- Touch donations, Paystack, Brevo, contact forms, security headers, SEO, or the
  match centre (1.8).
- Replace the login screen and call the CMS done.

---

## 9. Recommendation

The brief is achievable and the low content volume makes it lower-risk than it
looks. Three decisions are needed before implementation:

1. **Architecture:** Option A (runtime, seconds-fast publish, larger rework) or
   Option B (build-time plus deploy hook, ~1–2 min publish, minimal risk).
2. **Cost:** Supabase free (pauses after 7 days idle) or Pro at $25/month.
3. **Backend ownership:** who creates the REFI Supabase project and supplies the
   environment variables.

My recommendation: **Option B + free tier** if the owner's priority is a working,
low-risk publishing workflow this week; **Option A + Pro** if the client will
publish frequently and seconds-fast publishing matters enough to justify
rewriting the public data layer.

I would start with Option B and treat Option A as a follow-up once the client is
publishing happily, because B delivers the client's actual goal — independent
publishing without GitHub — while leaving the working public site alone.
