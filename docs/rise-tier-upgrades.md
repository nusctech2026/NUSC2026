# Rise Premium upgrades

## Pricing rules

- A normal active Rise General member is charged the Premium price less the amount on their verified, settled General tier payment order. A member who paid â‚¹3,894 owes â‚¹9,086.
- The upgrade credit is read and stored by the database. No client amount or client identity is accepted as authoritative.
- A member who has no verifiable paid General tier order receives no credit and is charged the full Premium price.
- Upgrade settlement preserves the current membership start and end dates.
- The allowlisted live smoke account may use a separate one-time â‚¹2 order after its â‚¹1 General smoke order. The server and database enforce the account, expiry, amount, prior paid smoke order, and single-use limit.

## AHIBI ticket replacement

- Checkout reserves the Premium season pass and links it to the verified paid General order. The database allows only one active replacement order per General order.
- After Razorpay capture is verified and settled, NUSC calls AHIBI `POST /api/nusc-partner/v1/reservations/{premiumReservationId}/replace-general` instead of the normal `/confirm` endpoint. Direct purchases continue to use `/confirm`.
- The replacement call is signed with the partner HMAC and sends the old reservation ID and NUSC payment ID. AHIBI confirms/retries idempotently, cancels unplayed General tickets, keeps checked-in history, and issues Premium tickets only for remaining matches.
- NUSC validates and stores the returned partial ticket set (1â€“10 records), marks the old unused tickets cancelled and the old pass replaced, then marks the Premium pass issued. Retries use the same Premium reservation and payment ID; they do not create another payment or ticket set.
- The old reservation status endpoint reports `replaced` with no ticket records. AHIBI returns the count of retained used tickets, but not individual checked-in records; those remain in AHIBIâ€™s internal booking and scan history. NUSC keeps its latest known used-ticket status and displays only the Premium tickets AHIBI issued.
- If all General match tickets are already used before checkout, NUSC blocks the upgrade. If no tickets remain by the time AHIBI processes a paid upgrade, NUSC marks it `refund_required` for staff follow-up rather than claiming tickets were issued.

## Migration and live smoke test

Apply `supabase/migrations/20261027170000_membership_upgrade_credits.sql` and then `supabase/migrations/20261027180000_ahibi_season_pass_replacement.sql` after the current membership smoke-test migration. Run the local membership smoke, AHIBI replacement, and payment security tests before promoting it. The smoke upgrade gate settings belong only in NUSC Web Production's private environment and should be set for a short UTC window:

```dotenv
NUSC_RISE_LIVE_SMOKE_UPGRADE_ENABLED=true
NUSC_RISE_LIVE_SMOKE_UPGRADE_USER_ID=<the smoke account Auth UUID>
NUSC_RISE_LIVE_SMOKE_UPGRADE_EXPIRES_AT=<UTC timestamp within the next 48 hours>
```

The smoke upgrade order is fixed at ₹2 (200 paise), independent of browser input. Disable the gate and remove its UUID and expiry settings after the test. Run the live smoke upgrade only after the AHIBI replacement endpoint and NUSC replacement code are deployed and the Supabase migration is applied.
