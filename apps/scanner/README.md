# NUSC Workforce ID Scanner

The scanner is a standalone Next.js PWA in the NUSC npm workspace. It has its own mobile-first UI and uses Supabase Auth for staff sign-in. The scanner server verifies the current account's user_roles on every request, then uses the server-only Supabase secret client to resolve printed IDs and call the existing record_campaign_attendance_scan RPC.

The RPC remains the source of truth for credential validity, match assignment, check-in/check-out transitions, concurrency, and attendance audit records. The PWA creates no attendance tables and performs no attendance writes while offline.

## Local development

1. Copy .env.example to .env.local.
2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the NUSC Supabase project values.
3. Set SUPABASE_SECRET_KEY to the server-only Supabase secret key. Never use a NEXT_PUBLIC_ name for this key.
4. From the monorepo root, run:

   ~~~sh
   npm run dev --workspace=@nusc/scanner
   ~~~

   The scanner opens at http://localhost:3104. Camera access works on localhost for local development. Test camera installation on a phone using an HTTPS preview deployment.

## Independent Vercel deployment

Create a Vercel project from the NUSC repository and set its **Root Directory** to apps/scanner. Enable **Include source files outside of the Root Directory in the Build Step**, because the scanner imports the shared `packages/db` workspace. Keep the detected Next.js framework and default build output. The app uses the repository npm workspace and root lockfile, like the other Next.js apps in this monorepo.

Set these project environment variables for Preview and Production:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SECRET_KEY (server only)

Deploy the Vercel project to a dedicated HTTPS hostname such as scanner.nagalandunited.com. No database migration is required. Production deployment and domain configuration remain separate operational steps.

## Install on phones

- **Android:** Open the HTTPS scanner URL in Chrome, sign in, then choose **Install app** when offered. The browser menu also has **Install app** or **Add to Home screen**.
- **iPhone/iPad:** Open the HTTPS URL in Safari, sign in, tap **Share → Add to Home Screen**, then enable **Open as Web App** if shown.

The app needs camera permission for QR scanning and an internet connection for every attendance operation. The service worker only caches versioned Next.js static assets and scanner icons; it never caches pages, auth/session responses, or attendance data.
