# Membership Payment & Dashboard Implementation Plan (ON HOLD)

This document outlines the approach for integrating Razorpay for membership registrations and building the member dashboard to display match benefits. It is currently on hold until membership fees and points structures are confirmed.

## Open Questions to Answer Before Resuming

1. **Membership Fee**: What is the exact amount for the membership fee? (e.g., ₹500, ₹1000)
2. **Initial Points**: How many NUSC points should a member receive upon successful activation/payment?
3. **Razorpay Setup**: We'll need Razorpay test keys (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`). Should we start with test mode, and can you provide them?
4. **Dashboard Content**: For the member dashboard, we will display active match benefits queried from the Payload CMS. Should we also include a "Redeem" button that simulates the redemption flow from Ticket 1?

## Proposed Changes

---

### Database Schema Updates

We will alter the `members` table to track payment states and add necessary columns. 

#### [MODIFY] `create_members_table.sql`
Add columns to track Razorpay identifiers and adjust the `status` flow:
- `razorpay_order_id` (TEXT, nullable)
- `razorpay_payment_id` (TEXT, nullable)
- `razorpay_signature` (TEXT, nullable)
- Modify `status` behavior to start as `pending_payment` and change to `active` upon successful verification.

---

### Backend Services & API Routes

We need to add Razorpay Node SDK and create server actions/endpoints for payment creation and verification.

#### [MODIFY] `package.json`
- Install `razorpay` package in `apps/web`.

#### [MODIFY] `packages/membership/src/service.ts`
- Update `registerMember` to create a user with `status: 'pending_payment'`.
- Generate a Razorpay Order ID securely and return it to the frontend alongside the member details.

#### [NEW] `apps/web/src/app/api/payment/verify/route.ts`
- An endpoint to verify the Razorpay signature after checkout.
- Upon valid signature, updates the member `status` to `active`.
- Provisions the initial NUSC Points allocation (creates the wallet and ledger entries as defined in Ticket 1).

---

### Frontend Components

The membership registration page needs to be updated to handle the Razorpay modal.

#### [MODIFY] `apps/web/src/components/membership/SplitMembershipLayout.tsx`
- Load the Razorpay Checkout script dynamically.
- Modify the `successData` flow: Instead of immediately showing success, trigger the Razorpay payment modal using the returned `order.id`.
- On payment success, call the `verify` endpoint. If successful, display the welcome message and membership number.

#### [NEW] `apps/web/src/app/dashboard/page.tsx`
- Create a protected Member Dashboard page.
- Query active `Matches` and `MatchBenefits` from the Payload CMS database tables (`matches` and `match_benefits`).
- Display the member's current NUSC Points balance and the list of available benefits.
