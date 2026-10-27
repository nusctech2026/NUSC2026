# NUSC and Ahibi season pass handoff

Rise General and Rise Premium checkouts use NUSC Razorpay. Before opening Razorpay, NUSC reserves all ten Ahibi tickets. After NUSC verifies capture and amount, it confirms that reservation with Ahibi. Ahibi does not create a second payment. General members choose G-1 through G-5 once; Ahibi applies that zone to all ten tickets.

## NUSC web server configuration

Set these variables in the server environment for the `apps/web` deployment (and in `apps/web/.env.local` for local development). They are server-only; do not prefix them with `NEXT_PUBLIC_` or put them in client code.

```dotenv
NUSC_AHIBI_SEASON_PASS_ENABLED=false
NUSC_AHIBI_PARTNER_MODE=test
AHIBI_PARTNER_TEST_BASE_URL=https://<Ahibi-test-host>
NUSC_PARTNER_TEST_KEY_ID=<test-key-id>
NUSC_PARTNER_TEST_SECRET=<test-secret>
```

For the live environment, use `NUSC_AHIBI_PARTNER_MODE=live`, `AHIBI_PARTNER_LIVE_BASE_URL`, `NUSC_PARTNER_LIVE_KEY_ID`, and `NUSC_PARTNER_LIVE_SECRET`. Set the enable flag to `true` only after Ahibi has provided the matching environment-specific credentials and the matching API host has been confirmed. Keep test credentials in non-production only and live credentials in production only. Never commit actual key values.

For a local test with AHIBI started by `npm run dev:nusc-test`, set `AHIBI_PARTNER_TEST_BASE_URL=http://localhost:5000`. NUSC permits plain HTTP only for `localhost`, `127.0.0.1`, or `[::1]` in non-production test mode. Any hosted test server must use HTTPS.

This monorepo uses the NUSC web deployment for this flow. The Admin and Store apps do not make partner API calls. Ahibi separately needs its partner API feature enabled and the matching NUSC key ID/secret configured on its side.

## Database and recovery

Apply `supabase/migrations/20261026180000_ahibi_membership_season_passes.sql` to the same Supabase project used by NUSC Web before enabling the flow. The migration records reservation state and the ten booking references. Ticket QR data is fetched from Ahibi only by the authenticated server-rendered Match Tickets page; it is not stored in Supabase.

If NUSC confirms payment but the Ahibi request times out, the paid order remains recoverable. The member can choose **Refresh ticket status** in Match Tickets; NUSC checks the signed Ahibi status/confirm endpoints and does not create another charge. An expired hold after a captured payment is marked for refund/reconciliation and must be handled by the club.

## Partner contract

The request signature format, endpoint payloads, status values, and sandbox procedure are maintained in the Ahibi project document `docs/nusc-partner-season-pass-api.md`. Ahibi's catalog resolves current fixture IDs; NUSC does not hard-code or send Ahibi event IDs, ticket counts, or prices.
