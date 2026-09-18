# NUSC architecture decision records

Recorded: 14 September 2026.

These six records explain the decisions already agreed in [Architecture v1](../ARCHITECTURE.md), their rationale, and when to revisit them. Product choices follow the source documents linked below; these ADRs do not settle open implementation details. Status **Accepted direction** means the architectural choice is inherited from that baseline; it does not mean an integration has been validated or implemented.

| Record | Agreed direction |
| --- | --- |
| [ADR-001](./001-three-app-monorepo.md) | One repository containing web, store, and admin |
| [ADR-002](./002-supabase-postgresql.md) | One shared Supabase-hosted PostgreSQL database per environment |
| [ADR-003](./003-payload-cms.md) | Payload CMS hosted in the admin application |
| [ADR-004](./004-domain-ownership.md) | Separate CMS and commerce data, contracts, and migrations |
| [ADR-005](./005-customer-staff-identity.md) | Supabase Auth for customers; Payload Auth for staff |
| [ADR-006](./006-commerce-runtime.md) | Shared server-side commerce library; no fourth backend initially |

The frozen architecture's references to planned ADRs describe the earlier document state. This index records their creation. Proposed tooling, physical schemas, storage integration, providers, and operating defaults still require the evidence and decisions identified in [Implementation Plan v1](../IMPLEMENTATION.md). Product choices remain owned by [PRD v1](../PRD.md), with journeys in [User Flows v1](../USER-FLOWS.md).

The current [PRD v1 decision revision 1](../PRD.md) records the user's answers of 14 September 2026. [Implementation Plan v1's dated resolutions](../IMPLEMENTATION.md#customer-branch-resolutions--14-september-2026) map those selections to tasks and gates:

| Decision | Selected product branch | User Flow source |
| --- | --- | --- |
| D-15 | Verified email required before purchase | [Selected verification branch](../USER-FLOWS.md#d-15-selected-verification-branch) |
| D-16 | Saved-address management included in v1 | [Selected address branch](../USER-FLOWS.md#d-16-selected-address-branch) |
| D-17 | Order-page cancellation request reviewed by staff | [Selected cancellation branch](../USER-FLOWS.md#d-17-selected-cancellation-branch) |

These branch choices are resolved. Verification mechanics, address/serviceability and privacy details, and cancellation/refund policy remain open under the referenced decisions; G06/G09 are not declared complete. A cancellation request does not automatically cancel or refund an order.

This is documentation-only preparation for I00-04, not completion of that task: its supported-version validation record remains outstanding. P00–P09 remain Planned. No platform code, provider validation, provisioning, or deployment was performed to create these records.

Changes to an agreed boundary require a follow-up ADR and the baseline version update required by Architecture v1. Record validation dates, exact versions, environments, and evidence when the separately authorized checks actually run.
