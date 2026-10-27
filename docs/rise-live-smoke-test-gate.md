# Temporary Rise live smoke-test gate

This gate temporarily limits new Rise General and Rise Premium checkouts to one authenticated Supabase user and creates one database-marked checkout for exactly INR 1 (100 paise). The shared plan prices remain INR 3,894 and INR 12,980. The Razorpay order is created from the amount stored on that payment order. Existing confirmations, webhooks, payment recovery, General seating-zone selection, and Ahibi reservation/issuance continue to use their normal server paths.

## Configure privately

In the NUSC Web deployment's **Production server environment** (Vercel project rooted at `apps/web`), set:

```dotenv
NUSC_RISE_LIVE_SMOKE_TEST_ENABLED=true
NUSC_RISE_LIVE_SMOKE_TEST_USER_ID=<Supabase Auth user UUID>
NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT=<UTC timestamp within the next 48 hours>
```

Get the tester ID from that user's Supabase **Authentication → Users** record. Use the Auth user UUID, not the member-row ID or email. Enter all three values directly in the private deployment settings; never put them in chat, source code, `NEXT_PUBLIC_*`, or a checked-in environment file. Apply the deployment platform's required redeploy for Production environment changes.

The gate is off when its enable setting is unset or `false`. When it is `true`, an invalid/missing tester UUID, missing/invalid UTC expiry, expiry more than 48 hours in the future or already expired, or any authenticated user other than the configured tester causes Rise checkout creation to fail closed. Expiry does not silently resume full-price sales: it blocks new Rise checkout until the operator turns the flag off explicitly.

## One-order limit and retry behavior

The database stores the smoke marker and 100-paise amount on the order atomically and has a unique constraint allowing only one smoke order in the NUSC database. Pending retries reuse that order and its Razorpay order ID. The order cannot be converted from a pre-existing full-price checkout. Once a smoke order is paid, cancelled, or failed, the gate will not create another smoke order. If an attempt fails or is cancelled, stop and reconcile the saved NUSC/Razorpay order before any separately approved reset; do not delete payment history manually.

Settlement still verifies the captured payment's order ID, exact stored amount, and INR currency. A smoke order settles only when the provider reports the same 100 paise capture. For tier-upgrade safety, the SQL settlement checks the actual listed tier prices rather than comparing the ₹1 test charge to the member's current tier.

## Shutdown

After the smoke purchase and recovery checks are complete:

1. Set `NUSC_RISE_LIVE_SMOKE_TEST_ENABLED=false` in NUSC Web Production and apply the platform's required redeploy.
2. Remove `NUSC_RISE_LIVE_SMOKE_TEST_USER_ID` and `NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT` from that environment.
3. Verify a new Rise checkout for an ordinary account follows the standard database plan price. Do not create a real payment just to verify this; use the existing test environment or a non-payment preflight.

Turning the flag off restores the normal, database-priced checkout path. A pending ₹1 smoke order cannot be returned by the normal checkout RPC after shutdown; its existing payment callback, webhook, and recovery paths remain available.
