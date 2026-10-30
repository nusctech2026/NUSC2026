# Campaign implementation and rollout

## Implemented workflow

1. Applicants choose one of 8 Ahibi, 5 Volunteer or 5 Crew roles and submit their details and photo. `Others` requires a description. Registration never accepts approval, assignment, match scope, ID or expiry from the browser.
2. Reviewers can review, waitlist or reject. Campaign managers and super admins can assign a role in the applicant's category, zone, shift and optional match restriction. Approval issues a unique ID and QR in the same database transaction, then attempts to email the pass. Email failure leaves the approval intact and is shown with a resend action.
3. Applicants use their application number and registered email to request a Supabase sign-in link. Status and pass-link lookup require a server-verified email session matching the application. Phone suffixes no longer grant access. Requests have persistent database rate limits.
4. Passes last 90 days. Each pass has a separate public bearer link and QR token. Only approved candidates with an active, valid credential can check in. Treat a pass link or printed QR as a credential: staff compare the candidate photo when admitting them.
5. Managers create one record per match, with its venue and check-in opening/closing times in India time. Gate staff must select the match and gate. Each person can check in once per match, with subsequent attempts recorded as duplicates. Campaign-wide passes work across matches; match-restricted applications cannot substitute another match.
6. Managers can revoke a pass immediately. Explicit replacement rotates the QR and pass-link tokens while keeping the candidate's ID number and past attendance. Reapproval alone never reactivates a revoked pass.
7. Campaign managers can resend the QR pass by email or open a prefilled WhatsApp share message. WhatsApp sharing requires a staff member to review and send the message.

The scanner decodes camera frames with jsQR, including browsers without native BarcodeDetector support. Camera denial has a manual printed-ID fallback. Physical camera performance still needs a real device rehearsal.

## Workforce registration extension

The `/registrations` page is the direct department-aware application form for the IFL 2026–27 workforce. It supports Ahibi, Volunteer, Media, Crew, Management, Officials and Medical applications with department-specific fields and server-side validation. The dedicated Press Accreditation flow remains separate. The role selector is shown only when roles are available for the selected department; Management roles are assigned by the server.

Workforce application IDs use department prefixes `AHB`, `VOL`, `MED`, `CRW`, `MGT`, `OFC` and `HLT`. Applicants request email access with their application ID and registered email. Status and pass lookups require a verified email session bound to the application. The request and status validators must accept every issued department prefix.

## Database changes

Apply these in order, to the intended environment:

- `20261027100000_create_campaign_tables.sql` (existing base migration, if not already installed).
- `20261027110000_campaign_workflow_hardening.sql` (new additive repair).
- `20261027120000_campaign_issue_crypto_search_path.sql` (qualifies Supabase's `extensions.gen_random_bytes` dependency for ID issuance and replacement).

The repair adds the 7 missing Ahibi roles, campaign staff roles, private rate-limit storage, atomic approval/issuance and match-bound check-in functions. The final migration fixes pass issuance for Supabase's pgcrypto schema. The migrations preserve existing applications and pass tokens. Existing approved applications get their preferred active role if assignment is missing, and receive an ID if missing. Revoked/expired IDs are not silently renewed. Legacy attendance with no match remains visible as **Legacy: match not recorded**; no historical match is guessed.

Apply these additional workforce migrations, in order, after the campaign tables and workflow migrations above:

- `20261028110000_unified_workforce_registration.sql`
- `20261028120000_add_media_team_to_workforce.sql`
- `20261028130000_workforce_department_details.sql`
- `20261028140000_workforce_media_authorisation_document.sql`
- `20261028150000_workforce_match_official_review_details.sql`
- `20261028160000_workforce_crew_affiliation.sql`
- `20261028170000_workforce_registration_integrity.sql`
- `20261028180000_workforce_registration_counter_backfill.sql`

The integrity migration requires the first six workforce migrations. The counter backfill belongs last; it seeds each department's counter from existing IDs without moving a counter backwards. Do not open workforce registration until these migrations are applied to the target database.

Before applying, privately check that existing `user_roles.role` values are within the supported staff roles and that there are no duplicate successful check-ins for the same non-null match and credential. The migration fails rather than deleting conflicting history. Existing approvals whose roles are inactive or in the wrong category need manager review.

Use the normal Supabase migration workflow. The standalone alternative requires an explicitly selected connection string and write flag:

```powershell
# Supply CAMPAIGN_DATABASE_URL privately in the process environment first.
node scripts/apply-campaign-migration.mjs --allow-database-writes
```

That helper applies all three campaign migrations in one transaction. It does not load environment files or choose a hosted database implicitly. Legacy `test-phase-*-campaign.mjs` commands now run the local tests; they no longer contain credentials or mutate a hosted database.

## Email and environment configuration

Both web and admin need the public website origin in `NEXT_PUBLIC_SITE_URL` (HTTPS in production), plus their existing Supabase URL and keys. The admin also needs a Resend API key and verified sender in `RESEND_API_KEY` and `CAMPAIGN_EMAIL_FROM` to send pass emails. WhatsApp uses a staff-reviewed `wa.me` share link; direct Business API delivery is not configured. Use private environment settings, never source files, for privileged keys and connection strings.

The public web Vercel project must also have a random `CRON_SECRET` of at least 16 characters before deployment. The scheduled `/api/cron/campaign-document-cleanup` route uses it to authorize daily cleanup of unlinked workforce documents older than seven days. Applicants must attach document uploads within six days; older uploads require a fresh upload so an active submission cannot race with cleanup. Vercel sends the secret as a bearer token for the configured cron job. If it is absent, cleanup requests fail closed; do not open document uploads until the production setting and scheduled job are confirmed.

In Supabase Auth, enable email sign-in and allow the exact deployed callback URL:

```text
https://<public-website>/campaign/auth/callback
```

Allow `http://localhost:3000/campaign/auth/callback` only for local development. Preserve the other apps' existing redirect URLs. Configure a working production email sender and verify both the magic-link and new-user confirmation email paths. Templates must send the Supabase confirmation URL through to the requested redirect, rather than hardcoding the homepage. The callback exchanges the PKCE code using the browser's stored verifier, including the installed SDK's `sb_flow_id` parameter. Expired or reused links fail closed. Requests ask users to open links in the same browser.

See [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless) and [signInWithOtp](https://supabase.com/docs/reference/javascript/auth-signinwithotp) for provider configuration. Tests do not send live emails or establish delivery.

## Staff permissions

| Role | Access |
| --- | --- |
| `super_admin` | All campaign operations; existing administrator access retained |
| `campaign_manager` | Applications, assignments, approval/IDs, matches, export, attendance and scanner |
| `reviewer` | Application review, notes, waitlist/rejection; cannot approve, assign, issue IDs or scan |
| `gate_staff` | Scanner and minimal match selection; cannot access applicant lists or other CMS data |

Assign roles to the correct existing Supabase Auth user through the trusted staff administration process. Do not create staff privileges from a public signup or applicant selection. Campaign-only staff are denied access to unrelated Payload collections and globals, including direct REST/GraphQL operations. Supabase data policies and privileged functions continue to require trusted server access.

## Exposed credential remediation — still requires live account work

Privileged service-role credentials and a database password were removed from all four campaign scripts. Removing source text does not invalidate a leaked credential.

The Supabase account owner must replace/revoke the exposed credentials and update every dependent runtime: web, admin, store, any functions, local private environments and database clients. For the legacy JWT-based API credentials found in these scripts, follow Supabase's current [API-key migration guide](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys) and [legacy-key guidance](https://supabase.com/docs/guides/troubleshooting/rotating-anon-service-and-jwt-secrets-1Jq6yd). Plan the public-key and secret-key cutover together; replacing only a browser environment variable does not revoke the old service-role key. Reset the exposed database password separately and update affected connection strings. Keep all replacement values out of chat and the repository.

No live keys, database passwords, provider settings or deployments were changed by this implementation.

## Verification and release

Local commands:

```text
npm run test:campaign
npm run test:campaign:browser
npm test
npm run typecheck -w @nusc/web
npm run build:web
npm run build -w admin
```

The campaign database tests use PGlite with synthetic auth/storage scaffolding. pgcrypto bytes are substituted only in that test fixture. They execute the production migrations/functions, check permissions, constraints, cross-match denial, duplicate prevention, expiry, revocation, reissue and rate limits. PGlite serialises queries; these tests do not claim a multi-connection PostgreSQL race test. The unique per-match check-in index independently enforces one successful admission. Browser tests render the production components with synthetic server actions and block external requests; they do not prove live Supabase, email or physical camera integration.

For release, back up the target database, rehearse the migrations and email flow in staging, then coordinate the database migration and web/admin releases. Old scanner clients omit the match and deliberately fail closed against the hardened function until refreshed. Do not restore the old phone-suffix lookup or matchless check-in as a rollback. If a release fails, stop campaign intake/scanning, preserve the database safeguards and fix or restore the compatible application deployment.

Before opening registration, perform one approved rehearsal on the real public and admin domains: submit each category, verify email access, review and approve, view/print the pass, create a match, scan with a phone, reject the duplicate, record a later match, revoke the pass and confirm denial. Check the unrelated membership and staff-login flows after credential replacement. Production readiness and independent final review remain separate from local test results.

## Local verification record

- Campaign backend/security: 26 tests passed.
- Browser checks cover the actual registration, applicant list/detail, email-access, approval, assignment, match, scanner, attendance and pass components with synthetic actions, including 390px and 1366px layouts.
- Public web and admin production builds passed, including TypeScript checks.
- Targeted web/test and admin lint passed with warnings. The admin ESLint configuration now imports Next's flat configurations directly; the incompatible FlatCompat adapter was removed without relaxing its rules.
- A broader `npm test` run passed 78 of 79 tests. Its unchanged route test rejects the homepage's existing `/about` link; that test and the navigation component were not changed for Campaign. The separately added campaign checks pass.
- A source scan found no embedded JWTs or database-password connection strings in the campaign paths. This does not establish live credential revocation.
