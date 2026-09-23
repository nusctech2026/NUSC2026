# Ticket 3: Member Dashboard Benefit Display & Redeem Flow

**Objective**: 
Implement the frontend and backend logic to allow an active member to reserve a match benefit, deducting points temporarily and generating a one-time authorization token for Ahibi.

**Steps Required**:
1. Create a dashboard view that queries active benefits for upcoming matches from the CMS (`matches` and `match_benefits` tables).
2. Create an API route or server action for `Redeem & Buy Ticket`.
3. The redemption action must verify:
   - User is authenticated
   - Membership is active
   - Points >= required amount
   - Benefit is active and within claim window
   - User hasn't already redeemed this benefit
4. If checks pass, reserve the points by calling the Ticket 1 RPC (`reserve_benefit_points`).
5. Create a `ticket_redemptions` record with status `reserved`.
6. Generate a one-time authorization token (store SHA-256 hash in DB with ~15 min expiry).
7. Return the redemption ID and the raw token to the frontend, which redirects the user to Ahibi (`https://ahibi.in/nusc-checkout?r=<token>`).

**Security Requirements**:
- All verification must happen server-side.
- Ensure the user cannot double-spend points if they click the button multiple times quickly (handled by RPC).
- Ensure the raw token is never stored in the database.
