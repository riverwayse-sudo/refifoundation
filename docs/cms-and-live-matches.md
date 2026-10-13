# REFI CMS and live match centre

## Current implementation foundation

- Sanity Studio is mounted at `/studio` and uses Sanity account authentication.
- Content schemas cover website pages, stories/news, projects/programmes, events, impact statistics, and featured-match selection.
- Live match retrieval is server-side through `/api/matches/live`. The API key is never exposed to the browser.
- The match centre polls the same-origin endpoint every 60 seconds; the server cache is 30 seconds.
- No fake match data is shown when the provider is not configured.

## Required setup before publishing

1. Create a Sanity project for REFI Foundation and choose the production dataset.
2. Add `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` to Vercel. These identify the public dataset; they are not API write tokens.
3. Invite the owner/editor in Sanity and test creating, editing, previewing, and publishing each document type.
4. Select a football-data provider plan after confirming the target competitions, API quotas, and update frequency.
5. Add `API_FOOTBALL_KEY` as a server-only Vercel environment variable if API-Football is selected. Never prefix it with `NEXT_PUBLIC_`.
6. Redeploy and test live, half-time, finished, postponed, empty-feed, provider-error, and missing-key states.

## Important limitations in this first foundation

- The CMS schemas and Studio are scaffolded, but existing public pages have not yet been switched to read from Sanity. The public pages remain on their current content until the content migration is implemented and reviewed.
- The live-match UI and provider adapter are ready for configuration, but actual live scores will not be available until a provider key is configured and its coverage is confirmed.
- Featured match documents are editorial metadata only at this stage; the match API does not yet filter the feed using those documents.
- Impact metrics include a verification flag to discourage publishing unverified claims.
- Production authentication and editor invitations must be completed in the Sanity project before the owner uses the Studio.

## Operating workflow

1. Create or edit content in Studio.
2. Preview it and check the image, spelling, links, and SEO fields.
3. Publish when approved.
4. Verify the corresponding public page after the content-reading integration is deployed.
5. For match data, check provider status and the timestamp on the match centre; do not manually overwrite provider scores.
