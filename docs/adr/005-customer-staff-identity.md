# ADR-005: Separate customer and staff identities

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Identity integration proof: not performed.

## Context and decision

Customers access their purchases while staff perform explicitly permitted editorial and operational actions. Sharing PostgreSQL does not merge these identities.

Use Supabase Auth for customers and Payload Auth for staff initially. Customer authentication grants no implicit staff access. Scope sessions/cookies to their applications. App adapters verify identity and pass a trusted actor context to protected operations, which enforce permissions and business rules server-side.

Authentication, operation authorization, and database grants/RLS are separate controls. A privileged database connection must not be assumed to carry a customer's identity or enforce that customer's access policy.

## Rationale and alternatives

The split follows the selected customer and CMS identity boundaries. Unified staff/customer SSO would require explicit integration and permission mapping; it has not been selected. Broad shared subdomain cookies do not establish authorization.

## Consequences and validation

The platform needs separate account lifecycle adapters and checks for customer ownership, staff roles, revoked permissions, and origin/CSRF controls. Exact sign-in/recovery methods, invitations, MFA, session policies, and retention/deletion behavior remain open under D-13/G05. Proposed role names do not define every permission.

PRD D-02 already requires an account before checkout; D-03 allows editors to publish directly. [PRD v1 decision revision 1](../PRD.md) records the user's selections of 14 September 2026: D-15 requires verified email before purchase; D-16 includes saved-address management in v1; D-17 uses order-page cancellation requests reviewed by staff. User Flows v1 marks each corresponding branch Selected: [D-15](../USER-FLOWS.md#d-15-selected-verification-branch), [D-16](../USER-FLOWS.md#d-16-selected-address-branch), and [D-17](../USER-FLOWS.md#d-17-selected-cancellation-branch). [Implementation Plan v1's dated resolutions](../IMPLEMENTATION.md#customer-branch-resolutions--14-september-2026) record their task and gate effects.

The branch choices are resolved; verification method, screen placement, resend/recovery mechanics, and D-08 cancellation/refund policy remain open. G06/G09 therefore still have implementation dependencies. This ADR follows those product records; it does not select an authentication method, close the remaining gates, or authorize implementation.

I01-04 provides isolated identity/permission evidence before adoption. Applicable P03/P05/P07 workflows require their own positive and denial checks. No auth system has been configured by this record.

## Revisit trigger and sources

Revisit the identity split if an approved journey requires cross-app staff SSO and its integration and security costs are justified.

Sources: [Architecture v1: authentication and authorization](../ARCHITECTURE.md#authentication-authorization-and-database-permissions), [PRD v1](../PRD.md), D-02/D-03/D-13/D-15–D-17, [User Flows v1](../USER-FLOWS.md), UF-04/UF-10/UF-17, and [Implementation Plan v1](../IMPLEMENTATION.md), G05/G06/G09.
