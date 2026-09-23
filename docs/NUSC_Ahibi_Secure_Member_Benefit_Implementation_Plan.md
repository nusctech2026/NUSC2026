# NUSC ↔ Ahibi Secure Member Benefit Redemption Implementation Plan

## Overview

This implementation uses a secure member-benefit redemption model for NUSC members purchasing match tickets through **Ahibi**.

The core security model is:

**Account-bound, non-transferable points + server-side redemption + short-lived purchase authorization + audit ledger**

The handoff between NUSC and Ahibi must be:

- **One-time**
- **Short-lived**
- **Server-validated**
- **Session-bound**

NUSC remains responsible for:

- Member authentication
- Membership status
- Points balance
- Benefit eligibility
- Points reservation and deduction
- Redemption authorization
- Audit history

Ahibi remains responsible for:

- Ticket inventory
- Ticket selection
- Checkout
- Payment
- Booking confirmation
- Ticket issuance

---

## 1. Member Has an Active NUSC Account

A member must already have:

1. Created an NUSC member account
2. Paid the membership fee
3. Had their membership activated
4. Received their annual NUSC Points allocation

Example:

```text
Membership: ACTIVE
Points: 100
```

No Ahibi account is required.

---

## 2. NUSC Admin Creates a Match Benefit

When an upcoming NUSC match is available for purchase on Ahibi, the NUSC admin creates or updates the match in the admin panel.

Example:

```text
NUSC vs Shillong FC
18 Nov 2026

Ahibi Event ID:
AHIBI_EVT_9382

Member Benefit:
10% OFF

Points Required:
10
```

Suggested `matches` table:

```text
matches

id
opponent
match_date
venue
ahibi_event_id
ahibi_ticket_url
status
created_at
updated_at
```

Suggested `match_benefits` table:

```text
match_benefits

id
match_id
name
description
points_cost
discount_type
discount_value
claim_start
claim_end
active
max_redemptions_per_member
created_at
updated_at
```

---

## 3. Benefit Appears in the Member Dashboard

Only active and relevant upcoming match benefits should appear in the member dashboard.

Example:

```text
NUSC vs Shillong FC
18 NOV 2026

MEMBER BENEFIT

10% OFF TICKETS
10 NUSC Points

[ Redeem & Buy Ticket ]
```

At this stage, no points have been deducted or reserved.

---

## 4. Member Clicks `Redeem & Buy Ticket`

The request must go to the **NUSC backend**.

The backend verifies:

```text
User authenticated?
        ✓

Membership active?
        ✓

Membership not expired?
        ✓

Points >= required amount?
        ✓

Benefit active?
        ✓

Claim window open?
        ✓

Already redeemed?
        ✕

Match/event valid?
        ✓
```

If any check fails:

```text
No redemption is created.
No points are deducted.
```

---

## 5. Reserve the Points

If all checks pass, do **not** deduct the points permanently yet.

Example:

```text
Before

Available: 100
Reserved: 0
```

After redemption begins:

```text
Available: 90
Reserved: 10
```

Create a wallet ledger entry:

```text
wallet_transactions

type: reserve
amount: -10
reference_type: ticket_redemption
reference_id: <redemption_id>
status: reserved
```

The balance check and reservation must happen atomically in the database.

---

## 6. Create a Redemption Record

Create a `ticket_redemptions` record.

Suggested structure:

```text
ticket_redemptions

id
user_id
membership_id
match_id
benefit_id

points_cost

status
token_hash

expires_at

ahibi_event_id
ahibi_session_id
ahibi_booking_id

created_at
validated_at
redeemed_at
released_at
expired_at
```

Suggested statuses:

```text
created
reserved
session_created
redeemed
released
expired
cancelled
```

At this point:

```text
status = reserved
```

---

## 7. Generate the One-Time Authorization Token

Generate a cryptographically random token on the server.

Conceptual example:

```text
nusc_rd_7Fad92...
```

Do **not** store the raw token in Supabase.

Store only:

```text
SHA-256(token)
```

The token should expire quickly.

Recommended expiry:

```text
10–15 minutes
```

The authorization should be bound internally to:

```text
NUSC user
membership
redemption
specific match
specific Ahibi event
specific benefit
points reservation
expiration
```

---

## 8. Redirect the Member to Ahibi

The member is redirected to an Ahibi integration URL.

Conceptual example:

```text
https://ahibi.in/nusc-checkout?r=<one-time-token>
```

The URL must **not** contain trusted business logic such as:

```text
discount=10
points=10
member=true
```

Those values must remain controlled by the NUSC backend.

The browser should carry only the opaque authorization token.

---

## 9. Ahibi Validates the Authorization Server-to-Server

When Ahibi receives the member, the **Ahibi server** sends the authorization to the NUSC backend.

Suggested endpoint:

```http
POST /api/integrations/ahibi/redemptions/validate
```

Example request:

```json
{
  "authorization": "nusc_rd_7Fad92...",
  "eventId": "AHIBI_EVT_9382"
}
```

Ahibi must authenticate itself when calling NUSC.

At minimum:

```http
Authorization: Bearer <AHIBI_PARTNER_SECRET>
```

For production, HMAC request signing is preferred.

---

## 10. NUSC Revalidates Everything

NUSC must not assume the redemption is still valid just because it was valid when it was created.

The backend checks again:

```text
Token hash exists?
        ↓
YES

Token not expired?
        ↓
YES

Status = reserved?
        ↓
YES

Membership still active?
        ↓
YES

Correct match?
        ↓
YES

Correct Ahibi Event ID?
        ↓
YES

Points reservation still exists?
        ↓
YES
```

If valid, NUSC returns:

```json
{
  "valid": true,
  "redemptionId": "red_839201",
  "eventId": "AHIBI_EVT_9382",
  "discount": {
    "type": "percentage",
    "value": 10
  }
}
```

Ahibi should never receive or control the member's wallet balance.

---

## 11. Bind the Redemption to One Ahibi Checkout Session

This is one of the most important security controls.

After successful validation, Ahibi creates one checkout session.

Example:

```text
AHIBI_SESSION_782931
```

Ahibi then supplies the session identifier to NUSC.

NUSC updates the redemption:

```text
redemption:
red_839201

ahibi_session_id:
AHIBI_SESSION_782931

status:
session_created
```

From this point onward, the authorization is permanently bound to:

```text
redemption
+
AHIBI_SESSION_782931
```

The original token must not be able to create another checkout session.

If someone copies and reopens the original URL:

```text
Token already bound to a session
→ reject
```

---

## 12. Consume the Authorization After Session Creation

Once the Ahibi checkout session exists, the original authorization token has completed its job.

Conceptually:

```text
reserved
   ↓
consumed_for_session
```

Ahibi should continue the purchase using:

```text
redemption ID
+
Ahibi checkout session ID
```

instead of reusing the original authorization token.

---

## 13. Ahibi Handles Ticket Checkout

Ahibi handles:

```text
Ticket selection
      ↓
Member discount
      ↓
Checkout
      ↓
Payment
      ↓
Ticket issuance
```

NUSC is not involved in the ticket payment itself.

---

## 14. Ahibi Sends a Successful-Purchase Webhook

After payment succeeds and the booking is created, Ahibi notifies NUSC.

Suggested endpoint:

```http
POST /api/integrations/ahibi/redemptions/complete
```

Example payload:

```json
{
  "redemptionId": "red_839201",
  "sessionId": "AHIBI_SESSION_782931",
  "eventId": "AHIBI_EVT_9382",
  "bookingId": "AHB-291837",
  "status": "paid"
}
```

The webhook must be authenticated and signed.

---

## 15. NUSC Verifies the Completion Webhook

The NUSC backend verifies:

```text
Valid Ahibi signature?
        ✓

Known redemption?
        ✓

Session ID matches?
        ✓

Event ID matches?
        ✓

Redemption not already completed?
        ✓
```

Then:

```text
reserved points
→ captured/spent
```

Example:

```text
Before purchase

Available: 90
Reserved: 10
Spent: 0
```

After purchase:

```text
Available: 90
Reserved: 0
Spent: 10
```

Update:

```text
redemption.status = redeemed
```

Store:

```text
ahibi_booking_id
redeemed_at
```

---

## 16. Failed or Abandoned Checkout

If the member closes Ahibi or payment fails, points must not be permanently spent.

After the checkout session expires:

```text
session_created
       ↓
expired
```

Release:

```text
Reserved: 10
Available: 90
```

back to:

```text
Reserved: 0
Available: 100
```

Create a ledger entry:

```text
wallet transaction
+10 points
type = release
```

This can be triggered by:

- An expiration/cancellation callback from Ahibi
- A scheduled NUSC cleanup process for stale reservations

Supporting both is preferred.

---

## 17. Wallet Ledger

Do not rely only on a mutable `points_balance` column.

Maintain an immutable transaction ledger.

Suggested table:

```text
wallet_transactions

id
user_id
wallet_id

transaction_type
points

reference_type
reference_id

status

created_at
```

Example history:

```text
+100  membership_activation
 -10  benefit_reservation
 +10  reservation_release
 -10  benefit_reservation
 -10  benefit_capture
```

A cached wallet balance may be maintained for performance, but the ledger should remain the source of audit history.

---

## 18. Recommended Database Model

Suggested core tables:

```text
profiles
memberships
membership_plans

member_wallets
wallet_transactions

matches
match_benefits

ticket_redemptions

integration_events
```

Suggested `integration_events` structure:

```text
integration_events

id
provider
event_type
external_event_id
payload_hash
status
received_at
processed_at
```

This gives NUSC an audit trail for Ahibi API calls and webhooks.

---

## 19. Prevent Double Spending

Example:

```text
Member has 10 points
```

They open two browser tabs and click:

```text
Redeem 10 points
```

at almost the same time.

The application must prevent both from succeeding.

The points reservation must happen atomically in PostgreSQL.

Conceptually:

```text
BEGIN

lock wallet

check available_points >= 10

reserve 10 points

create redemption

COMMIT
```

Never rely on the frontend to determine whether enough points are available.

---

## 20. Prevent Multiple Redemptions Per Match

If the rule is:

> One member benefit per member per match

enforce it in the database.

Conceptually:

```text
(user_id, match_id, benefit_id)
```

should be unique for successful/active redemption states.

Do not rely only on disabling the button in the frontend.

---

## 21. API Authentication Between NUSC and Ahibi

At minimum use:

```text
Private partner credentials
+
HTTPS
```

For production, use HMAC SHA-256 request signing.

Example headers:

```http
X-NUSC-Partner: ahibi
X-Timestamp: 1790109132
X-Signature: <signature>
```

Conceptual signature:

```text
HMAC(
  secret,
  timestamp + "." + raw_request_body
)
```

NUSC verifies:

```text
signature valid
timestamp recent
request not replayed
```

The same principle should protect Ahibi callbacks/webhooks.

---

## 22. Webhook Idempotency

Ahibi may send the same successful-booking webhook more than once.

This must not cause duplicate point deductions.

Example:

```text
First webhook
→ capture 10 points

Second webhook
→ already processed
→ return success
→ deduct nothing
```

Use a unique value such as:

```text
booking_id
```

or an Ahibi event/webhook ID as the idempotency key.

---

## 23. Do Not Expose Sensitive Membership Information

Ahibi should receive only the data required for the current ticket purchase.

Good response:

```json
{
  "valid": true,
  "redemptionId": "...",
  "discount": {
    "type": "percentage",
    "value": 10
  }
}
```

Do not expose:

```text
Full wallet history
Home address
Date of birth
Membership payment history
Total point balance
Other benefits
```

---

## 24. Member Experience

From the member's perspective, the flow should remain simple.

Example dashboard card:

```text
NUSC vs Shillong FC

10% OFF MEMBER TICKETS

10 NUSC Points

Balance: 100 pts

[ REDEEM & BUY TICKET ]
```

After clicking:

```text
Redirecting you securely to Ahibi...
```

Then the member arrives at Ahibi checkout.

There should be no:

```text
Coupon copying
OTP
Second account requirement
Email matching
Manual verification
```

---

## 25. Admin Experience

The NUSC admin panel should show:

```text
Member:
NUSC-00124

Match:
NUSC vs Shillong FC

Benefit:
10% OFF

Points:
10

Status:
Redeemed

Ahibi Booking:
AHB-291837

Created:
...

Redeemed:
...
```

Useful statuses:

```text
Reserved
Checkout Started
Redeemed
Expired
Released
Failed
```

---

# Final Architecture

```text
                     NUSC MEMBER
                          │
                          │ authenticated
                          ▼
                   MEMBER DASHBOARD
                          │
               Redeem 10 NUSC Points
                          │
                          ▼
                    NUSC BACKEND
                          │
                  Validate membership
                  Validate benefit
                  Validate balance
                          │
                          ▼
                    Reserve 10 pts
                          │
                          ▼
              Create one-time authorization
                          │
                          │ 10–15 min
                          ▼
                         AHIBI
                          │
                          │ server-to-server
                          ▼
                 NUSC VALIDATION API
                          │
                          ▼
                   Authorization valid
                          │
                          ▼
                 AHIBI CHECKOUT SESSION
                          │
                  session ID returned
                          │
                          ▼
                   Bind authorization
                    to that session
                          │
                          ▼
                      CHECKOUT
                          │
                          ▼
                       PAYMENT
                          │
                    ┌─────┴─────┐
                    │           │
                 SUCCESS      FAILED
                    │           │
                    ▼           ▼
              Ahibi webhook   Session expires
                    │           │
                    ▼           ▼
              Capture points  Release points
                    │
                    ▼
                REDEEMED
```

---

# Security Properties Achieved

## One-time

One authorization can create only one Ahibi checkout session.

## Short-lived

The authorization expires after a small time window such as 10–15 minutes.

## Server-validated

Ahibi validates the authorization directly with the NUSC backend.

The browser never decides whether the member gets a discount.

## Session-bound

After validation, the redemption is bound to one specific Ahibi checkout session.

A copied authorization cannot be used to create another checkout.

---

# Additional Security Controls

The implementation should also include:

- Account-bound, non-transferable NUSC Points
- Server-side balance checks
- Atomic point reservations
- Immutable wallet transaction ledger
- Hashed authorization tokens
- HTTPS
- HMAC-signed partner API requests
- Rate limiting
- Replay protection
- Idempotent webhooks
- Unique database constraints
- Match-specific redemption restrictions
- Reservation expiry and automatic point release
- Admin audit logging
- Minimal data sharing with Ahibi

---

# Required Support From Ahibi

Before implementing the Ahibi-specific integration, confirm that Ahibi can support:

1. Receiving a one-time NUSC authorization during the checkout handoff
2. Calling the NUSC validation endpoint server-to-server
3. Creating and returning a unique Ahibi checkout/session ID
4. Binding the NUSC redemption to that checkout session
5. Rejecting reuse of the same authorization
6. Sending NUSC a signed successful-booking callback/webhook
7. Providing cancellation/session-expiry information where possible

If these integration points are available, the architecture can enforce the intended one-time, short-lived, server-validated, and session-bound redemption model.
