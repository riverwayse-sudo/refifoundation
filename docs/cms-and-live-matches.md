# REFI Foundation CMS and live match centre

## CMS: Decap CMS (free, open-source, Git-based)

The site uses Decap CMS instead of a time-limited hosted CMS subscription. Content is stored as JSON in this Git repository, with version history in GitHub and deployments through the existing Vercel pipeline.

- Admin: `/admin/`
- Content: `content/*.json`
- Uploaded images: `public/uploads/`
- Publication: editorial workflow, with changes reviewed through GitHub pull requests
- No paid CMS plan, hosted database or external media subscription is required.

### Required one-time authentication setup

Create a dedicated GitHub OAuth App with callback URL `https://refifoundation.com/api/cms/callback`. Add its client ID and secret to the Vercel project as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`; add `NEXT_PUBLIC_SITE_URL=https://refifoundation.com`. The secret must be server-only and must never be prefixed with `NEXT_PUBLIC_` or committed to Git. Configure Preview first and test sign-in before Production. The OAuth app must be authorised for the REFI repository.

The OAuth handler uses a one-time state cookie, exchanges the code server-side, and sends the token only to the CMS popup opener. If the production domain changes, update the OAuth app callback, `NEXT_PUBLIC_SITE_URL`, and the Decap `base_url` together.

### Editing workflow

1. Open `/admin/` and sign in with an authorised GitHub account.
2. Edit homepage content, stories, projects/programmes, events, impact metrics or website pages.
3. Save a draft and inspect the generated diff.
4. Publish through the editorial workflow; review and merge only after the preview build and content are checked.
5. Confirm the deployment is ready and inspect the public page.

### Content integrity

- Impact metrics must be explicitly marked verified before they appear publicly.
- Events must have status `Published` and a future start date to appear in the upcoming-events list.
- Pages require `published: true`; a future publication date remains hidden.
- Story and page body fields accept Markdown and are converted into text blocks for the existing rich-text renderer.
- Use consented images and never publish sensitive personal details about children or vulnerable people.

## Live match centre

The match centre remains separate from the CMS and retrieves scores server-side through `/api/matches/live`. API keys must remain server-only.

Competition scope:
- Nigerian domestic leagues supported by the chosen provider.
- English Premier League (API-Football league ID 39).
- UEFA Champions League (API-Football league ID 2).

The browser refreshes every 60 seconds and the server cache is 30 seconds. No fabricated scores are shown when the provider is not configured.

### Configuration still required for live scores

1. Confirm a genuinely free football-data provider and its competition coverage; do not assume a free tier includes live Nigerian league data.
2. Add the provider key as a server-side Vercel environment variable, Preview first.
3. Test live, half-time, finished, postponed, empty-feed, provider-error and missing-key states.
4. Verify Nigerian competition coverage and quota limits before Production.

## Cost policy

Do not activate a paid subscription, paid CMS plan, paid media service or paid sports-data plan without explicit approval. Free software does not guarantee that hosting, domains, storage or football data are free; check current quotas and billing settings for each service.
