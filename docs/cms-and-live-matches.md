# REFI CMS and live match centre

## Current implementation foundation

- Sanity Studio is mounted at `/studio` and uses Sanity account authentication.
- Content schemas cover website pages, stories/news, projects/programmes, events, impact statistics, and featured-match selection.
- Live match retrieval is server-side through `/api/matches/live`. The API key is never exposed to the browser.
- The match centre polls the same-origin endpoint every 60 seconds; the server cache is 30 seconds.
- No fake match data is shown when the provider is not configured.

## Live match competition scope

The match centre is scoped to:
- Nigerian domestic leagues returned by API-Football (country = Nigeria; competition type = League where the provider supplies the type).
- English Premier League (API-Football league ID 39).
- UEFA Champions League (API-Football league ID 2).

The adapter filters the provider's live fixture feed on the server before returning matches to the browser. Provider coverage of individual Nigerian competitions can vary by plan and season; verify NPFL and any other intended Nigerian divisions in the provider dashboard before launch. If API-Football's account plan does not include those competitions, upgrade or choose a provider with explicit coverage rather than assuming an empty feed means there are no games.

## Required setup before publishing

1. Create a Sanity project for REFI Foundation and choose the production dataset.
2. Add `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` to Vercel. These identify the public dataset; they are not API write tokens.
3. Invite the owner/editor in Sanity and test creating, editing, previewing, and publishing each document type.
4. Create an API-Football account and confirm coverage for the Nigerian leagues REFI wants to show, the English Premier League, and UEFA Champions League; verify live fixture quota, request rate limits, and season availability.
5. Add `API_FOOTBALL_KEY` as a server-only Vercel environment variable for Preview first, then Production after testing. Keep the value encrypted/sensitive and never prefix it with `NEXT_PUBLIC_`.
6. Redeploy after environment variables are added. Test live, half-time, finished, postponed, empty-feed, provider-error, and missing-key states.
7. Confirm the feed only returns the three requested competition groups and that scores/statuses update as expected during an actual live fixture.

## Provider configuration plan

- **Provider:** API-Football / API-Sports, using `https://v3.football.api-sports.io`.
- **Secret:** `API_FOOTBALL_KEY` (server-side only).
- **First environment:** Vercel Preview on the feature branch, so the owner can validate without affecting production.
- **Refresh:** browser polling every 60 seconds; server cache 30 seconds. Check the selected subscription's terms and quota to ensure this polling pattern is appropriate.
- **Fallback:** no fabricated scores; show the existing disconnected/provider-unavailable state and log provider errors without exposing the key.
- **Launch gate:** verify Nigerian league coverage, rate limits, API response for each target competition, and all match statuses before production rollout.

## Important limitations in this first foundation

- Published Stories & News reads published story documents from Sanity and has dynamic story detail pages. Homepage headline, introduction, calls to action, and hero image are editable through Homepage & site settings. Projects/programmes, upcoming events, and verified impact metrics feed their public sections. About, Our Work, Impact, and Get Involved can each use a published Website page document (slug must match the route) with rich-text body, hero image, summary, and SEO fields; existing designed page content remains as a fallback when no CMS page is published. Stories and events have their own document types and publication workflows.
- The live-match UI and provider adapter are implemented, but actual live scores will not be available until a provider key is configured and its competition coverage is confirmed.
- Featured match documents are editorial metadata only at this stage; the match API does not yet filter the feed using those documents.
- Impact metrics include a verification flag to discourage publishing unverified claims.
- Production authentication and editor invitations must be completed in the Sanity project before the owner uses the Studio.

## Operating workflow

1. Create or edit content in Studio.
2. Preview it and check the image, spelling, links, and SEO fields.
3. Publish when approved.
4. Verify the corresponding public page after the content-reading integration is deployed.
5. For match data, check provider status and the timestamp on the match centre; do not manually overwrite provider scores.
