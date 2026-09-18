# ADR-006: Shared commerce library without a fourth backend

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Runtime implementation: not started.

## Context and decision

Store and staff tools need the same commerce rules. Use the server-only `packages/commerce` library in both store and admin, with persistence in `packages/commerce-db`. There is no separately deployed commerce service initially.

Store owns customer endpoints and payment webhook ingestion. Admin owns staff endpoints and dashboard adapters. Entry points authenticate callers; commerce operations enforce their contracts and invariants. The shared domain library must not depend on React, Payload UI, Next.js request/cookie APIs, or application internals.

## Rationale and alternatives

A shared library avoids duplicated order/stock logic and another initial backend deployment. A separate service could provide independent runtime ownership but would add network and operating responsibilities without a demonstrated initial need. Copying business rules into both apps is excluded.

## Consequences and validation

Different deployed app revisions can contain different library revisions. Database/API compatibility and checks across both consumers remain necessary.

Commerce owns its database transaction scope. Persist durable intent before retryable external effects; do not hold a database transaction open across provider calls. Deduplicate operations/events, enforce valid state transitions, reconcile ambiguous outcomes, and release expired reservations through a defined mechanism. Payment success requires verified server-side evidence.

Durable asynchronous work may be required even without a fourth backend. Scheduler/queue technology and execution host remain open. Designated consumers must claim work safely; store and admin must not independently schedule duplicate effects. P04/P06 must supply concurrency, retry, ambiguity, and recovery evidence using the selected policies and test providers.

## Revisit trigger and sources

Revisit a separate service if a non-Next.js consumer needs stable remote commerce operations, separate teams require runtime ownership, or repeated mixed-version incidents prevent safe releases. Stronger job infrastructure needs measured backlog or completion/recovery evidence.

Sources: [Architecture v1: commerce contracts](../ARCHITECTURE.md#commerce-contracts-and-transaction-rules), [background jobs](../ARCHITECTURE.md#background-jobs-and-external-integrations), [tradeoffs](../ARCHITECTURE.md#tradeoffs-and-revisit-triggers), and [Implementation Plan v1](../IMPLEMENTATION.md), P04/P06.
