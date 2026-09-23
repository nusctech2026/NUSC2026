# NUSC Agent Workflow

## Shared rules

- Complete one ticket at a time.
- Preserve Ticket 1 security guarantees.
- Never trust client-provided identity, points cost, discount value, Ahibi event ID, redemption state, token expiry, or session state when authoritative values exist in the database.
- Do not weaken tests to make them pass.
- Do not allow multiple agents to edit the same files concurrently.

## Roles

### Builder
Implements the assigned ticket.
May edit production code.
Must not approve its own work.

### QA
Writes and runs acceptance/integration tests.
Should not modify production code unless explicitly asked by the orchestrator.

### Security Reviewer
Performs adversarial testing.
Focus on:
- RLS
- authorization bypass
- cross-user access
- race conditions
- point double-spending
- token replay
- expired tokens
- event substitution
- session binding
- privilege boundaries

### Final Reviewer
Read-only reviewer.
May return PASS only when acceptance criteria, QA tests, and security tests all pass.
