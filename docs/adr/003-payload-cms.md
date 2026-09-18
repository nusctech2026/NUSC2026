# ADR-003: Payload CMS inside the admin application

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Integration validation: not performed.

## Context and decision

The current club site stores content in project files. Staff need to maintain club content through an editing interface.

Host Payload, its Admin UI, CMS APIs, staff authentication, configuration, and CMS migrations in `apps/admin`. Web consumes published content through CMS contracts instead of querying Payload's internal tables. Payload owns editorial content and editorial media metadata. Products and their marketing content remain commerce-owned under [ADR-004](./004-domain-ownership.md).

Custom staff commerce screens call commerce operations. Payload's generated CMS editor is not assumed to provide those integrations. Under PRD D-03, content editors publish directly and administrators manage permissions.

## Rationale and alternatives

This places editorial tools and staff entry in the selected admin application. Continuing with file-only content would retain the current deployment simplicity but would not meet the approved staff-editing goal. A fourth standalone CMS deployment is not part of the agreed runtime model.

## Consequences and validation

CMS availability and public cache freshness need explicit handling. Published-only reads, private drafts/previews, authenticated invalidation, retry, and withdrawal behavior must be verified before content cutover. Store checkout must not depend on CMS availability.

Payload/Next.js/React compatibility and the database and upload integrations remain unverified. Supabase Storage is preferred, not validated. I01-01/I01-02/I01-05 and P03 supply the relevant proof and delivery work. Editable fields, public player scope, permissions, freshness targets, and media lifecycle details remain subject to G04/G05 and related decisions.

## Revisit trigger and sources

If an authorized compatibility proof cannot preserve the agreed ownership or content-delivery requirements, record the evidence and a follow-up decision before changing the integration or boundary.

Sources: [Architecture v1: applications and runtime boundaries](../ARCHITECTURE.md#applications-and-runtime-boundaries), [content delivery](../ARCHITECTURE.md#content-delivery-caching-and-seo), [PRD v1](../PRD.md), D-03/D-11/D-12, and [Implementation Plan v1](../IMPLEMENTATION.md), P01/P03.
