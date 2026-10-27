# Ahibi membership entry integration

NUSC now has a separate annual membership entry flow. It is independent of the Ticket 1 points-redemption API and never reads or spends points.

## Match setup

Run `npm run dev` from the repository root to start the Web app, Payload Admin, and Store with their normal development scripts. Open `http://localhost:3001/admin/membership-matches` and sign in as a `super_admin`, `store_manager`, or `membership_manager`. Match mappings use the Supabase project configured in `apps/admin/.env.local`; the authenticated server uses the service-role key for database access. Apply the membership match migration to the intended Supabase project before adding fixtures.

In Payload Admin (locally at `http://localhost:3001/admin/membership-matches`), open **Membership → Match Entries** as a `super_admin` or `store_manager`. Add each home match and its Ahibi event ID. The event ID is stored by NUSC and checked against the one-time entry before Ahibi can create a booking. The optional Ahibi event URL is only a member-facing link. The member page lists only upcoming matches with a future date.

## Member handoff

The signed-in member selects an upcoming mapped home match in `/dashboard/tickets`. NUSC checks the active paid membership and plan entitlement, then issues a random 256-bit token. Only its SHA-256 hash is stored. The raw token is sent to:

```text
https://ahibi.in/nusc-membership-checkout?r=<opaque-token>
```

The token expires after 15 minutes and is bound to the member, membership, fixture, Ahibi event, entry tier, and one match allocation. A successful Ahibi booking consumes the allocation. A signed failure callback releases an in-progress allocation. Reusing a redeemed match allocation is rejected.

## Ahibi server callbacks

All requests use the existing Ahibi HMAC headers: `x-ahibi-timestamp`, `x-ahibi-request-id`, and `x-ahibi-signature`. The signature is SHA-256 HMAC over `<timestamp>.<request-id>.<raw-json-body>` with `AHIBI_PARTNER_SECRET`. Request timestamps are limited to five minutes and request IDs are replay-protected.

### Validate before creating the checkout session

```http
POST /api/integrations/ahibi/membership-entry/validate
```

```json
{"authorization":"<opaque-token>","eventId":"<Ahibi event ID>","sessionId":"<new unique Ahibi session ID>"}
```

NUSC responds with `valid`, `redemptionId`, the database-bound `eventId`, `entryType`, and `price: 0`. Ahibi must use the returned entry type and zero-price entitlement; it must not accept client-supplied member status, price, event mapping, or entry tier.

### Confirm a successful booking

```http
POST /api/integrations/ahibi/membership-entry/complete
```

```json
{"redemptionId":"<NUSC entry ID>","sessionId":"<bound session ID>","eventId":"<Ahibi event ID>","bookingId":"<unique Ahibi booking ID>"}
```

### Release a failed or cancelled checkout

```http
POST /api/integrations/ahibi/membership-entry/failed
```

```json
{"redemptionId":"<NUSC entry ID>","sessionId":"<bound session ID>","eventId":"<Ahibi event ID>"}
```

Callbacks must be server-to-server and signed. Completion is idempotent for the same booking. A session or event mismatch is rejected.

## Partner dependency

This repository implements NUSC's handoff and callback endpoints. Complimentary booking is usable end to end only after Ahibi supports the checkout URL and these signed callbacks, and both sides configure the same partner secret. The current NUSC code cannot create or issue Ahibi tickets by itself.
