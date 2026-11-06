# REFI Foundation CMS — provisioning and acceptance runbook

**Status:** Prepared for owner-led setup. This document does not mean a Supabase
project has been created, connected, or accepted.

**Related implementation:** draft PR #20, with audit corrections in draft PR #24.
**Architecture:** Option B — Supabase-backed editor, static Next.js public site,
JSON snapshot fallback, and a Vercel rebuild after publishing.

Use this runbook only for a dedicated REFI Foundation Supabase project. Do not
reuse another client's or organisation's project.

---

## 1. Go / no-go checks

Before creating anything, confirm all of the following:

- [ ] The owner accepts the Option B trade-off: publishing saves to Supabase and
      triggers a site rebuild; it is not instant runtime publishing.
- [ ] The owner accepts the documented Supabase Free-tier limitations: inactivity
      pause risk, no automatic backups, and no leaked-password protection.
- [ ] A dedicated REFI Supabase project will be used.
- [ ] The person who will be the first CMS administrator has supplied their
      work email address. Do not request or share their password.
- [ ] Someone with access to the REFI Vercel project can add environment variables
      and create a production deploy hook.
- [ ] A preview-access method is available for acceptance testing. Vercel preview
      deployments are protected by SSO; a successful deployment status alone is
      not a visual acceptance test.

**Stop if the owner does not accept the static publishing limitation.** Do not
silently change the public website to runtime database rendering.

## 2. Create the dedicated Supabase project

1. Sign in to Supabase using the organisation-approved account.
2. Create a new project named clearly, for example 'refi-foundation-cms'.
3. Select the Free plan only if the owner has reaffirmed the zero-recurring-cost
   requirement.
4. Use a strong, unique database password and store it in the organisation's
   password manager. It is not needed by the website application.
5. Choose a region appropriate for the Foundation's users and operating team.
6. Wait until the project reports that it is ready.
7. Record the project reference and dashboard URL in the client's secure
   operations record. Do not put credentials in GitHub issues, pull requests,
   chat messages, or this document.

Do not create a second project if one already exists for this exact REFI CMS.
First verify ownership and purpose with the client.

## 3. Apply the database migration

1. Open the REFI project in Supabase.
2. Open SQL Editor and create a new query.
3. Copy the complete contents of
   'supabase/migrations/0001_cms_schema.sql' from the reviewed implementation
   branch.
4. Run it once and confirm there are no SQL errors.
5. Open Table Editor and confirm these tables exist:
   - 'public.content'
   - 'public.cms_admins'
6. Open Storage and confirm a public bucket named 'media' exists.

The migration creates the content table, admin allow-list, visibility function,
row-level security policies and public media bucket. It is designed to be
re-applied safely, but do not edit the SQL manually in the dashboard. Keep the
versioned migration in Git as the source of truth.

### Security expectations

- Anonymous/public reads are restricted by row-level security to content that
  passes the visibility rules.
- The anon key is public by design; it is not an administrator credential.
- There are no direct write policies for anonymous or authenticated users.
- Privileged writes and media uploads use the service-role key on the server only,
  after the caller is checked against 'cms_admins'.
- Do not create public sign-up or grant write access to the 'authenticated' role.

## 4. Create the first administrator

1. In Supabase, open Authentication → Users.
2. Invite or create the first editor using the email address approved by the owner.
   The user should set their own password through the provider's supported flow.
3. Copy the user's Auth UUID from the Users screen.
4. In SQL Editor, add the user to the allow-list, replacing the two example
   values with the approved email and exact UUID:

   ~~~sql
   insert into public.cms_admins (user_id, email)
   values ('00000000-0000-0000-0000-000000000000', 'editor@example.org')
   on conflict (user_id)
   do update set email = excluded.email;
   ~~~

5. Verify the row exists:

   ~~~sql
   select user_id, email, created_at
   from public.cms_admins;
   ~~~

Only add people who are authorised to publish on behalf of the Foundation.
Removing a user's row revokes CMS administrator access. Do not add an account
based only on possession of a valid Supabase login.

## 5. Create the Vercel deploy hook

1. Open the REFI Foundation project in Vercel.
2. Go to Settings → Git → Deploy Hooks.
3. Create a hook with a recognisable name such as 'REFI CMS publish'.
4. Select the production branch, expected to be 'main'.
5. Copy the generated URL directly into the Vercel environment variable in the
   next section. Treat the URL as a secret: anyone holding it may be able to
   trigger a deployment.
6. Do not paste the URL into source code, a commit, a public issue, or this
   runbook.

A successful request to this hook means a deployment was requested. It does not
prove that the deployment completed or that the public pages were visually
checked.

## 6. Configure Vercel environment variables

In Vercel → Project → Settings → Environment Variables, add the following.
Use the exact names and do not add a 'NEXT_PUBLIC_' prefix to secrets.

| Variable | Value source | Exposure |
|---|---|---|
| 'SUPABASE_URL' | Supabase project API settings | Server configuration |
| 'SUPABASE_ANON_KEY' | Supabase project API settings | Public key; RLS must protect data |
| 'SUPABASE_SERVICE_ROLE_KEY' | Supabase project API settings | **Server-only secret** |
| 'VERCEL_DEPLOY_HOOK_URL' | Deploy hook created in section 5 | **Secret URL; server-only** |
| 'CRON_SECRET' | Generate a long, random secret | **Server-only secret** |

Recommended environment scope:

- Set all five for Production.
- Set all five for Preview only if the owner wants the preview CMS connected
  to the same REFI database. This means preview editors can affect the same
  content and should be an explicit decision.
- Do not configure these for unrelated projects or environments.
- Local development should use a private, ignored '.env.local' file. Never commit
  it or paste its values into a support conversation.

For 'CRON_SECRET', generate a unique random value using an approved password
manager or secrets generator. Do not use a memorable word, project name, or
reused password.

After saving variables, trigger a fresh deployment. Environment variable changes
do not retroactively update an already-built deployment.

## 7. Import the existing JSON content

Do this once the migration is applied and the server-side project URL and
service-role key are available in a secure local environment.

1. Check out the reviewed CMS branch and install dependencies using the lockfile:

   ~~~bash
   npm ci
   ~~~

2. Set 'SUPABASE_URL' and 'SUPABASE_SERVICE_ROLE_KEY' in the local shell or
   ignored '.env.local' file. Do not use a 'NEXT_PUBLIC_*' variable.
3. Review the current 'content/*.json' files and confirm they contain the
   intended baseline content.
4. Run:

   ~~~bash
   npm run cms:import
   ~~~

5. Confirm the command reports the number of records imported.
6. In Supabase Table Editor, inspect the rows in 'public.content' and check
   collection, slug, publish state and timestamps.

The importer upserts on '(collection, slug)'; it does not delete rows. Running it
again can overwrite matching records with the repository's JSON values. Do not
run it again after editors have started working unless the owner has reviewed
the impact and approved the overwrite.

The current import includes the homepage and records from stories, projects,
events, impact metrics and pages. Empty JSON collections simply import zero rows.

## 8. First sign-in and functional acceptance

Use a preview deployment with an approved Vercel protection-bypass method, or
another owner-approved staging path. Do not weaken preview protection globally
just to make this test convenient.

### A. Configuration and access

- [ ] Visit '/admin'; the CMS should show its sign-in interface, not the
      not-connected state.
- [ ] Sign in with the invited administrator's own credentials.
- [ ] Confirm the dashboard loads and the expected collections are visible.
- [ ] Sign out and confirm the session is cleared.
- [ ] Sign in with a valid Supabase user who is **not** in 'cms_admins'; access
      must be denied and the session cookies cleared.
- [ ] Test the password-reset flow using the administrator's email and confirm
      the email arrives. Do not disclose whether arbitrary addresses have accounts.

### B. Draft and publish lifecycle

Use clearly labelled test content, not a real public announcement.

- [ ] Create a test story and save it as a draft.
- [ ] Confirm it is absent from the public story listing, story route and sitemap.
- [ ] Publish the test story.
- [ ] Confirm the dashboard reports that the deployment was requested.
- [ ] Wait for the Vercel production/approved test deployment to finish.
- [ ] Confirm the story appears in the public listing, its route and the sitemap.
- [ ] Return the story to draft/unpublished and trigger the required rebuild.
- [ ] Confirm it is no longer publicly visible and is absent from the sitemap.

### C. Supporting page

- [ ] Create a test item under Other pages with a unique slug.
- [ ] Publish it and wait for the rebuild.
- [ ] Confirm '/pages/<slug>' loads and the sitemap includes it.
- [ ] Confirm the special 'our-work' slug does not create a duplicate
      '/pages/our-work' route.
- [ ] Confirm the page is not automatically added to the main navigation.

### D. Media upload

- [ ] Upload a small PNG or JPEG below 4 MB.
- [ ] Confirm it appears in the editor and renders on the public page after rebuild.
- [ ] Confirm an unsupported SVG is rejected.
- [ ] Confirm a file with a spoofed MIME type or mismatched binary signature is
      rejected.
- [ ] Confirm a file larger than 4 MB is rejected with a clear message.

### E. Content and security checks

- [ ] Confirm drafts and future-dated stories are not exposed through the public
      content read path.
- [ ] Confirm unverified impact metrics are not shown.
- [ ] Confirm an ordinary signed-in non-admin cannot write directly to the
      database through the anon/authenticated API.
- [ ] Confirm unsafe CTA and registration URLs such as 'javascript:',
      'data:' and protocol-relative URLs are rejected.
- [ ] Confirm the service-role key is not present in browser bundles, rendered
      HTML, client requests, source maps, or repository files.
- [ ] Confirm public pages remain usable if Supabase is unavailable, using the
      committed JSON fallback.
- [ ] Check desktop and mobile layouts, browser console, navigation, page
      metadata and canonical URLs.

### F. Cron keep-alive

The Vercel cron is configured for '0 6 * * *' (06:00 UTC, 07:00 in Lagos).
Vercel sends the configured 'CRON_SECRET' as a bearer token for scheduled cron
requests.

- [ ] Confirm the production deployment includes the cron configuration.
- [ ] Confirm a request without the bearer secret returns HTTP 401.
- [ ] Confirm a request with an incorrect secret returns HTTP 401.
- [ ] Confirm the scheduled invocation returns a successful response and that
      Supabase responds.
- [ ] Check Vercel cron logs after the first scheduled run.

This endpoint only checks Supabase activity. It does **not** trigger a website
rebuild or automatically publish future-dated content.

## 9. Editorial rules and known limitations

These are product behaviours, not defects to work around:

- **Stories:** a story needs a publish date that is not in the future.
- **Pages:** a page must be marked published and must not have a future publish
  date.
- **Events:** an event must have status 'Published' and a future start time at
  build time. An event already included in a deployment may remain visible after
  it starts until another deployment runs.
- **Impact metrics:** a metric is public only when its 'verified' field is true.
  The editor cannot set this field. Verification currently requires an authorised
  administrator to update the database directly; there is no in-app approval
  workflow.
- **Slugs:** existing slugs are locked. To change a public URL, create a new
  record with the new slug and unpublish the old record.
- **Scheduling:** future dates do not create a timer. A later build must run after
  the date before a scheduled story/page appears. The daily keep-alive is not a
  scheduler.
- **Publishing:** a deploy-hook success is not the same as deployment success.
  Check Vercel deployment status and the resulting public page.

For a time-sensitive release, publish after the intended release time or arrange
an owner-approved deployment at/after that time. Do not promise exact-minute
publication with the current design.

## 10. Backups and recovery

The Supabase Free plan has no automatic backups. Take a snapshot after meaningful
editorial sessions and before any bulk operation:

~~~bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run cms:snapshot
~~~

The command writes two outputs:

- '.cms-backups/cms-backup.json' contains **all editorial rows, including drafts**, and is used by 'npm run cms:restore'. Treat it as internal material: it may contain unpublished announcements or other non-public content.
- The individual 'content/*.json' files contain **published rows only** and are the safe static fallback used by the public website. An unpublished homepage never overwrites the last published homepage snapshot.

Review both outputs carefully. Commit only the published JSON snapshots. The repository is public. **Never commit the full backup or any unpublished editorial content to Git.** The backup is written under the gitignored '.cms-backups/' directory. Copy it to the Foundation's approved private/encrypted storage and restrict access to authorised operators.

For a full editorial recovery from the privately stored backup:

1. Confirm the target Supabase project is the correct REFI project.
2. Retrieve the latest '.cms-backups/cms-backup.json' from the Foundation's approved private backup storage, place it in the local '.cms-backups/' directory, then confirm its generated date and contents.
3. Run 'npm run cms:restore' using the approved service-role key.
4. Confirm the restored rows in Supabase, including draft/published state.
5. Trigger a rebuild and verify the public site.

The restore command upserts every row in the backup but does not delete rows created after that backup. It is a recovery aid, not a destructive point-in-time rollback. The regular 'npm run cms:import' command is for the initial import from the public JSON files, not full editorial recovery.

## 11. Rollback and incident response

If the CMS dashboard fails but the public site is healthy:

1. Do not delete the Supabase project or its data.
2. Check Vercel deployment logs and the five environment variables.
3. Check Supabase project status and authentication logs.
4. Keep the public site running from its last successful static deployment or
   committed JSON fallback while the CMS issue is investigated.

If a public deployment breaks the site:

1. In Vercel → Deployments, identify the last known-good production deployment.
2. Promote that deployment to Production using the owner's approved rollback
   procedure.
3. Confirm the canonical public URL, key routes and navigation recover.
4. Investigate the failed deployment separately; do not make emergency edits to
   production secrets without recording the change.

If a service-role key or deploy-hook URL is exposed, rotate it immediately in
the provider dashboard and update Vercel. Do not merely delete the message or
repository reference and assume the secret is safe.

## 12. Acceptance sign-off

Do not mark the CMS production-ready until the owner and implementation reviewer
have recorded:

| Acceptance item | Result / evidence |
|---|---|
| Dedicated REFI Supabase project | Pending |
| Migration and RLS applied | Pending |
| Initial admin allow-list verified | Pending |
| Vercel environment variables configured | Pending |
| First sign-in and non-admin denial | Pending |
| Draft → publish → public page | Pending |
| Unpublish → rebuild → public removal | Pending |
| Media upload and rejection tests | Pending |
| Sitemap and canonical checks | Pending |
| Keep-alive cron verified | Pending |
| Snapshot and restore rehearsal | Pending |
| Desktop/mobile visual review | Pending |
| Owner acceptance of static scheduling limitation | Pending |

Record the tester, date, deployment URL/commit and evidence for each completed
item. A green CI run or a Ready Vercel deployment is not a substitute for these
checks.

**Current state:** no REFI Supabase project has been provisioned, no credentials
have been added to Vercel, no real administrator has been created, and no
production acceptance test has been completed. Keep PRs #20 and #24 unmerged
until the required review and owner acceptance are complete.
