# ADR-004: Explicit CMS and commerce ownership

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Boundary proof: not performed.

## Context and decision

A shared database and staff dashboard must not create competing owners of the same business data.

Payload owns club editorial records, staff records, editorial media metadata, and its migrations. Commerce owns the canonical catalogue, product descriptions/media metadata, variants, prices, inventory, carts, orders, fulfilment/refund records, and customer application profiles. Supabase Auth owns customer credentials and sessions; application business data remains separate. Object storage holds file bytes, with lifecycle responsibility assigned to the owning domain.

`packages/commerce` defines business operations. `packages/commerce-db` owns commerce persistence and migrations. Store and admin call authorized commerce operations rather than duplicating rules or using Payload's database connection for commerce mutations. CMS runtime credentials have no commerce mutation privileges by default.

## Rationale and alternatives

Distinct contracts and migrations make authority explicit and protect checkout-critical data from editorial changes. A second product catalogue in Payload or unrestricted shared-table access would create competing mutation paths and is excluded by this baseline.

## Consequences and validation

Custom admin integrations and coordinated migration histories are required. Cross-domain references use stable IDs and owner contracts, with defined missing/archived fallbacks; consumers do not join another domain's internal tables. Cross-owner deletion must not cascade destructively. Historical orders preserve immutable purchase snapshots.

Logical ownership is required regardless of physical schema layout. I01-02 must prove migration scope and grants; I01-06 checks dependencies and generated contracts. P04 must verify atomic stock/order updates, authorization, idempotency, and owned-order access. Sharing one deployment does not grant one connection every domain's privileges.

## Revisit trigger and sources

A future requirement for CMS editorial content referencing products needs an explicit contract decision. Moving authority, permitting cross-owner mutations, or introducing an authoritative external fixture provider requires a follow-up decision; it cannot silently duplicate the current source of truth.

Sources: [Architecture v1: data ownership](../ARCHITECTURE.md#data-ownership-and-source-of-truth), [API and contract ownership](../ARCHITECTURE.md#api-and-contract-ownership), and [Implementation Plan v1](../IMPLEMENTATION.md), G02, P01/P04.
