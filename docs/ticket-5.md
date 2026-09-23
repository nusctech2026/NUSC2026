# Ticket 5: Ahibi Completion Webhook & Failure Recovery

**Objective**: 
Implement the endpoints to handle successful checkout completion (capturing points) and failure/expiration (releasing points).

**Steps Required**:
1. Create a completion webhook endpoint: `POST /api/integrations/ahibi/redemptions/complete`.
2. When Ahibi notifies of a successful booking:
   - Verify Ahibi authentication/signature.
   - Verify `sessionId` matches the redemption record.
   - Ensure it's not already completed (idempotency).
   - Capture the points (update ledger from reserved to spent, update redemption status to `redeemed`, record `ahibi_booking_id`).
3. Implement failure recovery:
   - Create an endpoint `POST /api/integrations/ahibi/redemptions/failed` or run a cron job to cleanup expired sessions.
   - If a session fails or expires without completion, release the reserved points back to the member's wallet using the Ticket 2 `release_benefit_points` RPC.
   - Update redemption status to `expired` or `released`.

**Security Requirements**:
- Must handle idempotent requests (Ahibi might send the completion webhook multiple times).
- Must verify that the session ID and event ID match exactly what was bound in Ticket 4.
- Must ensure that points are reliably released if Ahibi never calls complete.
