# ADR-002: Shared Supabase PostgreSQL per environment

Status: Accepted direction, inherited from Architecture v1.

Recorded: 14 September 2026. Integration validation: not performed.

## Context and decision

CMS and commerce need persistent data with explicit ownership. Use one Supabase-hosted PostgreSQL database shared by the three apps within each environment. This does not mean sharing one database across development, staging, and production.

Separate domain ownership, restricted runtime roles, and owner-scoped migrations are mandatory. Physical CMS/commerce schemas are preferred only after validation. Payload owns CMS migrations; commerce owns its migration history. Supabase-managed structures remain under Supabase ownership.

## Rationale and alternatives

A shared database reduces infrastructure count while permitting distinct domain contracts. Separate databases would strengthen resource and recovery isolation but add operational coordination beyond the selected initial architecture.

## Consequences and validation

Capacity, availability, and recovery are coupled. Connection budgets must account for all apps and jobs. Runtime credentials and migration credentials have separate privileges; a coordinated release process orders migrations. App startup must not race to migrate shared data.

Exact adapter versions, schema layout, grants, pooling, hosting plans, and recovery capabilities remain unverified. I01-02/I01-03 must demonstrate owner-scoped changes and runtime isolation, including denial of commerce mutations through CMS credentials. Use the selected version's results to choose custom schemas or a tested alternative. This record makes no current claim about adapter support.

Database recovery and object recovery require coordinated planning; file objects must not be assumed to be included in database backups. Actual recovery targets and owners remain open.

## Revisit trigger and sources

Revisit a shared database when measured contention breaches agreed targets despite tuning, or access, recovery, or compliance requirements demand isolation.

Sources: [Architecture v1: PostgreSQL boundaries and migrations](../ARCHITECTURE.md#postgresql-boundaries-and-migrations), [resilience and recovery](../ARCHITECTURE.md#resilience-and-recovery), and [Implementation Plan v1](../IMPLEMENTATION.md), G01/G02/G11 and P01.
