# Ticket 4: Ahibi Server-to-Server Validation

**Objective**: 
Implement the webhook/endpoint where Ahibi validates the one-time authorization token to create a checkout session.

**Steps Required**:
1. Create a secure API endpoint for Ahibi: `POST /api/integrations/ahibi/redemptions/validate`.
2. Authenticate Ahibi (e.g., using a static partner secret for now).
3. The endpoint receives the raw token and the `eventId`.
4. The server must hash the raw token and look up the redemption record.
5. Revalidate everything (status is reserved, token not expired, membership active, correct event ID).
6. If valid, Ahibi creates a session (simulated on our end by receiving a `sessionId` from Ahibi in the request or returning the redemption details so Ahibi can create a session).
7. Actually, according to the plan, Ahibi calls this to validate. Wait, the plan says Ahibi calls `/validate` and then Ahibi creates a session. Then Ahibi supplies the session ID to NUSC. To simplify, we can accept `sessionId` in this validate request or a separate `/bind` request. Let's combine them: Ahibi sends the token and its new `sessionId`. 
8. Bind the redemption to the `ahibi_session_id` and update status to `session_created`.
9. The token is now consumed and cannot be used again to create a new session.

**Security Requirements**:
- Must re-verify all conditions before returning `valid: true`.
- The token must become permanently bound to the `sessionId`. Reusing the token must fail.
- Do not trust client-provided discount values; return them securely from our database to Ahibi.
