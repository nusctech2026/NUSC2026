# NUSC Accreditation Scanner

The standalone Next.js PWA scans the seven active `campaign_ids` accreditation categories: **Ahibi**, **Volunteer**, **Media**, **Crew**, **Management**, **Officials**, and **Medical**. It recognizes the existing printed `NUSC-ID-YYYY-...` values and 64-character hexadecimal QR tokens; it does not introduce a new QR format. Legacy Press & Media records in `press_accreditations` are a separate workflow and are not one of these scanner categories.

The scanner uses the existing `campaign_ids`, `campaign_applications`, `campaign_roles`, and `campaign_events` data and the attendance RPC. The server remains authoritative for accreditation state, event eligibility, revocation, access rules, check-in/check-out transitions, and duplicates. An offline local match is provisional and is never shown as server-confirmed attendance.

## Offline-ready scanning

The installed PWA caches its scanner shell and required static assets. QR decoding continues locally with the existing camera and `jsqr` implementation. To prepare for a low-connectivity location, sign in while online, select an active match, and choose **Prepare offline match** before connectivity is lost. The server checks staff authorization and event-specific eligibility, then returns a snapshot for approved credentials with an active matching role, valid dates, and the selected event in scope. Snapshots are scoped to that staff account and match and expire after eight hours.

The snapshot stores hashes for QR tokens and printed IDs, plus the name, ID number, category, role, validity window, and a photo-availability flag. It contains no photos or signed photo URLs. Snapshot and queued scan payloads are encrypted with AES-GCM in IndexedDB using a per-staff device key. This protects stored values at rest within the browser profile; it is not protection against a compromised device or same-origin script. Keep scanning devices physically controlled and do not clear site data while scans are pending. Browser storage can still be evicted or lost with the device.

Every captured scan is written to the encrypted IndexedDB queue before the app acknowledges the capture locally. Offline results are labelled **Pending server check** and do not count as confirmed attendance. Each queued operation keeps one operation ID across retries. When the scanner can reach the server, it automatically retries queued operations with backoff through `record_campaign_attendance_scan_idempotent`. Successful results become **Synchronized**; server rejections and attendance/idempotency conflicts remain visible as **Rejected** or **Conflict**. A delayed response or interrupted connection leaves the operation pending for retry, using the same ID.

Offline limitations:

- Prepare and refresh a snapshot while online; an expired snapshot cannot authorize new offline captures.
- Offline checks cannot see a later revocation, permission change, or attendance recorded on another device. The server rechecks these when the queued scan synchronizes and may reject or mark it as a conflict.
- Offline snapshots are tied to the signed-in staff account and selected match. They cannot be refreshed or transferred to another account while offline.
- IndexedDB persistence is requested but remains under browser/device storage policy. Keep the app open or return online promptly so pending scans can synchronize; do not treat a pending local result as confirmed attendance.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the intended Supabase project.
3. Set `SUPABASE_SECRET_KEY` to a server-only Supabase secret key. Never use a `NEXT_PUBLIC_` name for this key. The shared database client retains `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback when no modern secret key is configured.
4. From the monorepo root, run:

   ~~~sh
   npm run dev --workspace=@nusc/scanner
   ~~~

   The scanner opens at `http://localhost:3104`. Camera access works on localhost for local development. Test installation on a phone using an HTTPS preview deployment.

## Independent Vercel deployment

Use the NUSC repository and set the Vercel **Root Directory** to `apps/scanner`. Enable **Include source files outside of the Root Directory in the Build Step**, because the scanner imports the shared `packages/db` workspace. Keep the Next.js framework and root npm lockfile.

Configure these environment variable names for Preview and Production; do not expose secret values in client code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` (server only; preferred for the scanner)

`SUPABASE_SERVICE_ROLE_KEY` is supported by the shared server client for existing legacy consumers when `SUPABASE_SECRET_KEY` is absent. It must also remain server-only.

Before deploying scanner code that synchronizes queued scans, confirm that migration `supabase/migrations/20261113100000_campaign_scan_idempotency.sql` is already applied and its history is reconciled in the target database. It provides the receipt-backed idempotency wrapper used for retry-safe attendance operations. This migration has already been applied and reconciled in NUSC Production; **do not run its SQL again there**. For a different database environment, follow that environment's controlled migration process once before deploying the scanner.

## Install on phones

- **Android:** Open the HTTPS scanner URL in Chrome, sign in, then choose **Install app** when offered. The browser menu also has **Install app** or **Add to Home screen**.
- **iPhone/iPad:** Open the HTTPS URL in Safari, sign in, tap **Share → Add to Home Screen**, then enable **Open as Web App** if shown.

Allow camera access and prepare the match snapshot before going offline. The service worker caches the app shell and versioned static assets, not authenticated pages, sessions, attendance responses, or accreditation snapshots; offline accreditation data lives in the encrypted IndexedDB stores.
