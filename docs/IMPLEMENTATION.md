# NUSC platform implementation plan

Version: Implementation Plan v1.

Status: frozen delivery baseline for Architecture v1, PRD v1, and User Flows v1. Implementation requires separate authorization.

Last updated: 14 September 2026.

Decision revision: 1, recorded 14 September 2026 from explicit user answers. D-15 requires verified email before purchase; D-16 includes saved-address management in v1; D-17 uses an order-page cancellation request reviewed by staff. These resolve existing v1 branches. Other open decisions remain open; implementation is not authorized.


Baselines: [Architecture v1](./ARCHITECTURE.md), [PRD v1](./PRD.md), and [User Flows v1](./USER-FLOWS.md). The v1 baselines remain frozen; PRD and User Flows decision revision 1 records the customer branches selected on 14 September 2026. Architecture v1 is unchanged.

## Purpose and authority

This document translates the frozen baselines into sequenced work, dependencies, deliverables, verification, and release gates. It does not select unresolved business policies, change scope, or prescribe unverified package/provider versions.

The earlier HTML-to-Next.js website migration already exists, and a later frontend-only realignment moved the public site and store preview into the app workspace. “Not started” below refers to the backend/platform CMS and commerce work. Documentation approval is separate from authorization to implement backend services, provision services, activate payments, or deploy.

A task must follow the agreed source requirements and flow branches. If implementation reveals a needed product change, record a PRD decision; if it changes an architectural boundary, use an ADR. Do not silently amend a frozen document or implement both alternatives to avoid resolving a decision.

## Current state and target

| Area            | Current state                                                                 | Target                                                                          |
| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Application     | npm workspace realigned to `apps/web`, `apps/store`, and placeholder `apps/admin` | Three independently deployable apps after validated platform setup              |
| Content         | Typed project files and existing JSX sections in `apps/web`                   | Payload-owned content consumed through CMS contracts                            |
| Store           | Frontend-only landing preview in `apps/store`; no checkout or commerce backend | Authenticated Nagaland-only INR purchases and staff operations                  |
| Persistence     | No implemented platform database connection                                   | One Supabase-hosted PostgreSQL database per environment with explicit ownership |
| Shared code     | App-local components/styles; no shared packages yet                            | Necessary shared UI/config/contracts plus server-only commerce code             |
| Tooling         | npm workspaces and root scripts for web/store                                  | Final workspace tooling to be validated; pnpm/Turborepo remain candidates only if deliberately selected |
| Store reference | Supplied ZIP/reference inspected for frontend landing-page work only           | Official catalogue/assets and backend-safe implementation inputs still required |

The current package files specify Next.js 16.3.4, React 19.3.0, and TypeScript 5.9.3. These are repository observations, not a validated Payload compatibility set. Select and record the actual platform versions during the compatibility phase.

Preserve existing work, original migration reference material, eight public routes, legacy destinations, fonts, crest, colors, responsive behavior, and enquiry interactions. The supplied store reference must not replace project configuration or introduce a second product source of truth.

## Planning conventions

- **Planned:** defined work that has not started.
- **Ready:** implementation is authorized and the task's actual prerequisites are satisfied.
- **In progress:** work is underway with an assigned owner.
- **In review:** the deliverable exists and evidence is available for review.
- **Done:** acceptance and relevant checks have passed; evidence is linked.
- **Blocked:** an attempted task cannot progress because of a named dependency; record an owner and next action rather than using this label for every future task.
- **Conditional/Optional:** scope qualifiers inherited from the PRD/User Flows; neither is automatic authorization.

All phases below are **Planned**. No implementation task or acceptance gate is marked complete. Owner names, dates, and estimates remain unassigned; accountable roles identify who must make or implement a decision.

### Phase status and completion

A phase is complete only when all required tasks in that phase are Done and its exit gate has passed with linked evidence. Optional/conditional tasks do not block completion unless selected into scope. However, an unresolved decision needed for a required journey still blocks that journey's task and phase acceptance; it cannot be relabelled optional to bypass the gate.

Use the same status vocabulary for phases, with phase status summarizing required task readiness and progress. Record excluded optional branches explicitly. A later task may begin when its specific dependencies are met even if unrelated work in an earlier phase remains open; this does not mark the earlier phase complete. Task IDs identify work, not an unconditional chronological order.

### Selected optional scope

No optional features have been selected for release in this plan. Selection requires a recorded product decision and corresponding task/evidence scope.

| Candidate                                                | Current selection                       | Selection owner                | Work affected                 |
| -------------------------------------------------------- | --------------------------------------- | ------------------------------ | ----------------------------- |
| Staff low-stock view                                     | Not selected                            | Store manager + product owner  | Optional part of I07-02       |
| Product search/additional filters                        | Not selected                            | Product owner                  | Optional part of I05-01       |
| Dedicated team/player pages and extra fixture navigation | Not selected                            | Editorial lead + product owner | Optional part of I03-06       |
| Other PRD Should/Could features                          | Not selected unless explicitly recorded | Relevant PRD owner             | Record task IDs when selected |

For each selection, record the decision/date, owner, chosen feature or branch, affected task IDs, acceptance evidence, and impact on phase gates. D-15 verification, D-16 saved addresses, and D-17 cancellation were selected on 14 September 2026 as recorded below. Only those selected branches are required; remaining method/policy dependencies still apply. Track the outcomes in G06/G09.

## Delivery map and dependencies

| Phase | Main deliverable                                                                       | Depends on                                                                | Accountable roles                            | Status  |
| ----- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- | ------- |
| P00   | Inputs, decision register, and approved task boundaries                                | Documentation baseline; build authorization before code work              | Club product owner + engineering             | Planned |
| P01   | Evidence that selected platform integrations and ownership boundaries work             | Relevant P00 technical inputs; isolated test environment                  | Engineering                                  | Planned |
| P02   | Three-app workspace and preserved club app                                             | Workspace/version choices from P01; existing-site baseline capture        | Engineering                                  | Planned |
| P03   | Staff access, editorial CMS, media, and web content integration                        | P02; CMS/auth/storage proof; D-11/D-12 and relevant D-13 choices          | Engineering + editorial lead + administrator | Planned |
| P04   | Canonical commerce persistence, contracts, inventory, and durable work foundations     | P02; database proof; relevant D-04/D-09 and permission rules              | Engineering + store manager                  | Planned |
| P05   | Reference-based storefront, cart, and customer account journeys                        | P04; reference/catalogue inputs; D-13/D-15/D-16 choices for affected work | Engineering + merchandise/product owner      | Planned |
| P06   | Delivery, payment, order access, and customer communications                           | P05; D-05/D-06/D-07/D-10 and applicable policy decisions                  | Engineering + finance + operations           | Planned |
| P07   | Staff catalogue, inventory, fulfilment, support, and refund workflows                  | P03 staff access; P04; P06 for payment-dependent actions; D-08/D-17       | Engineering + store/support staff            | Planned |
| P08   | Integrated staging evidence, accessibility, operational readiness, and club acceptance | Required P03–P07 work; D-14 targets and launch policies                   | Engineering + club reviewers + operations    | Planned |
| P09   | Separately authorized production release and handover                                  | P08 passed; production readiness and explicit launch authorization        | Engineering + club release owner             | Planned |

P03 and P04 have independent work once P02 and their own decisions are ready. Catalogue browsing in P05 need not wait for refund-provider integration, but it must not be presented as a purchase-ready store. P07 product/stock screens can follow P04 before payment integration; its refund work cannot. This dependency map is not permission to skip gates or a requirement to use multiple agents.

## Decision and input gates

Resolve only the decisions needed for the next task. A missing payment provider does not block editorial modelling; a missing shop export blocks reference-matching work rather than all platform preparation. No pending choice has a silent timeout default.

| Gate | Source                               | Required input or decision                                                                                                                                          | Work held until resolved                                                     | Accountable role                         |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| G01  | Architecture platform decisions      | Workspace tooling, compatible app/CMS versions, database adapter and connection strategy                                                                            | Final dependency setup and integration adoption                              | Engineering                              |
| G02  | Architecture data/storage boundaries | Tested ownership/grants/migration layout; Payload storage integration                                                                                               | Shared-environment schema/media deployment                                   | Engineering                              |
| G03  | D-04 and reference dependency        | Actual shop export, official products/variants/prices/stock/assets and sizing                                                                                       | Final catalogue model/content, matching storefront, live product publication | Merchandise lead + product owner         |
| G04  | D-11/D-12                            | Editable fields, launch teams/season, public player scope, English/IST default acceptance, publication/removal targets and media permissions                        | Final CMS models and affected public journeys                                | Editorial lead                           |
| G05  | D-13                                 | Customer sign-in/recovery method, staff roles/MFA/invites, session/privacy/deletion rules                                                                           | Production-scope identity and protected workflows                            | Administrator + privacy/product owner    |
| G06 | D-15/D-16 | Selected 14 September 2026: verified email before purchase and saved-address management. Verification method/screen placement and D-06/D-13 details remain open. | Dependent implementation still needs the relevant method, address, and privacy inputs | Product owner |
| G07  | D-09                                 | Cart identity/merge rules with D-13, stock/reservation/expiry, quantity and restocking rules                                                                        | Cart/stock/checkout behavior that depends on those rules                     | Store manager + product owner            |
| G08  | D-05/D-06/D-07                       | Payments, Nagaland serviceability/charges/estimates, tax presentation and required purchase documents                                                               | Delivery/payment/invoice integration and live checkout                       | Finance/accountant + operations          |
| G09 | D-08/D-17 | D-17 selected 14 September 2026: order-page cancellation request reviewed by staff. D-08 eligibility and return/exchange/refund policy remain open. | Policy-dependent customer requests and staff refund/return handling | Operations + policy reviewer |
| G10  | D-10                                 | Staffed support channel, sender/channel/provider, notification content and response expectations                                                                    | Actual support/transactional delivery integration                            | Support/operations                       |
| G11  | D-14 and architecture operations     | Budget/plans, environments/domains, named release/halt/purchase-restriction/recovery authorities, browser/performance/freshness targets, RPO/RTO and alert response | Staging sign-off and launch readiness                                        | Product owner + operations + engineering |
| G12  | PRD launch policy checklist          | Approved shipping, refund/return, privacy, terms, tax/invoice, support, and applicable youth-content permissions                                                    | Live sales and affected public content                                       | Club policy owners                       |

D-01 Nagaland/INR, D-02 account-required checkout, and D-03 editor direct publishing are already agreed and must not be reopened as implementation defaults. D-15, D-16, and D-17 were resolved by explicit user answers on 14 September 2026.

### Customer branch resolutions — 14 September 2026

| Decision / owner | Selected branch and affected tasks | Required acceptance evidence / gate impact |
| --- | --- | --- |
| D-15 / product owner | Verified email before purchase; I05-03, I06-01/I06-02, I06-05 | Server-side denial before payment for unverified users; verification/resume and resend/recovery checks. G06 choice resolved; method, screen placement, and D-13 details remain open. |
| D-16 / product owner | Saved-address management in v1; I05-04, I06-01 | Owned add/edit/select/remove; explicit saving; cross-customer denial; current delivery validation; historical order snapshots unchanged. G06 scope resolved; D-06/D-13 details remain open. |
| D-17 / club operations | Order-page cancellation request for staff review; I07-04 with I06-04/I06-05 | Owned/eligible request, acknowledgement/pending review, duplicate protection, staff authorization, and decision visibility; no automatic cancellation/refund. G09 initiation resolved; D-08 policy and provider dependencies remain open. |

P05/P06/P07 acceptance and relevant P08 integrated checks must cover these selected branches. No verification has run and no task becomes Ready or Done from these decisions.

The six supporting records now exist in the [ADR index](./adr/README.md): three-app monorepo, Supabase PostgreSQL, Payload CMS, domain ownership, identity split, and no fourth backend initially. They document agreed direction; I00-04 remains incomplete pending its supported-version validation record and required review/evidence.

## Task-level dependency checkpoints

Phase entry rules still apply. These references make the important internal sequencing explicit; unrelated completed work need not be repeated.

| Task                           | Depends on / required input                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I01-01                         | I00-01 baseline, relevant G01 choices, I01-07 isolated environment and proof authorization                                                                      |
| I01-02, I01-03                 | I01-01 selected version foundation; I01-07 environment; relevant G02 access configuration                                                                       |
| I01-04, I01-05, I01-06         | I01-01 plus the database/runtime proof needed by each integration; relevant G02/G05 inputs                                                                      |
| I02-01                         | Passed P01 foundation evidence and recorded workspace choice                                                                                                    |
| I02-02, I02-03, I02-04, I02-05 | I02-01; use I00-01 as the web preservation baseline                                                                                                             |
| I02-06                         | I01-07 environment contract, I02-01 workspace, scoped non-production provisioning authorization and environment decisions                                       |
| I03-01                         | P02 foundation and validated staff-auth integration; applicable G05 choices                                                                                     |
| I03-02, I03-03                 | I03-01 access foundation, G04 model/content scope; model definition precedes repeatable import                                                                  |
| I03-04, I03-05, I03-06         | Approved CMS models; I03-05 media and I03-04 publication contracts precede dependent web cutover                                                                |
| I04-02, I04-03, I04-04, I04-05 | I04-01 persistence/contracts; each operation's G07 and permission policy; durable-work foundation precedes claiming retry/expiry completion                     |
| I05-01, I05-02                 | I00-03 reference intake, required catalogue inputs, and applicable I04 product/cart operations                                                                  |
| I05-03, I05-04                 | Validated customer auth plus G05/G06 branch choices; relevant I05-02 cart-association behavior                                                                  |
| I06-01                         | I05 account/cart prerequisites and G08 delivery/tax input; G06 address branch                                                                                   |
| I06-02, I06-03                 | G08 provider/account test setup, I06-01 reviewed checkout, I04 order/retry foundations; outcome handling and event/recovery verification are completed together |
| I06-04, I06-05                 | I04-04 owned-order access, reliable I06-02/I06-03 states, and G08 document/G10 communication policy                                                             |
| I07-01, I07-02                 | I03-01 staff access and I04-01/I04-02 product/inventory/audit operations                                                                                        |
| I07-03                         | I03-01 staff access, I04-04 order access, I06 confirmed order states and G08 fulfilment rules                                                                   |
| I07-04                         | I06-02/I06-03 verified payment/refund capability, G09 selected policy/branch, and current staff refund permissions                                              |
| I08-01 through I08-07          | Applicable P03–P07 delivery, selected scope, staging from I02-06, and G11/G12 acceptance inputs                                                                 |
| I09-05                         | P08 reconciled import evidence, approved data owners and authoritative source manifests; approval occurs before final cutover                                   |
| I09-01, I09-02                 | P08 passed and explicit production authorization; I09-02 also requires I09-01 environment readiness and I09-05 approved import ownership/manifests              |
| I09-03, I09-04                 | I09-02 successful compatible cutover, smoke verification and complete handover material from I08-07                                                             |

Provider test setup is a prerequisite to payment implementation, not merely a launch chore. Refund workflows require verified provider refund capability as well as a UI. Where a provider capability is still unavailable, keep that task open rather than declaring mock evidence complete.

## Artifact and evidence convention

The application folders and ADR files now exist. The package and evidence locations below remain planned conventions unless the repository already contains them; this document does not create deployment records or mark implementation evidence complete.

| Artifact                                     | Location convention and handling                                                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Architectural/technical decision records     | `docs/adr/`; link only after a file exists                                                                                   |
| Phase/task acceptance summaries              | `docs/evidence/Pxx/`, with task ID, revision, environment, date, checks, results and limitations                             |
| Generated test reports/screenshots           | Ignored local `artifacts/` or access-controlled CI artifacts; link stable run/revision identifiers from the evidence summary |
| Migration/seed/import reconciliation reports | Phase evidence summary with sanitized counts/mappings; raw customer/source data stays in approved restricted storage         |
| Environment/release/recovery records         | Versioned runbooks and release records referenced from P08/P09 evidence; secret values stay outside the repository           |

Each phase owns its evidence index: P00 inputs/decisions; P01 integration proof; P02 workspace/regression; P03 CMS/import; P04 commerce invariants; P05 customer UI/auth; P06 payment/order; P07 staff operations; P08 acceptance/recovery; P09 cutover/handover. Assign retention and access for evidence containing sensitive operational data. Do not commit credentials, payment payloads, customer data, or private screenshots merely to prove a test ran.

## P00 — Prepare the work without changing product scope

**Entry:** the frozen documents are available. P00 may include requested documentation-only preparation without build authorization. Repository mutations outside the authorized documentation scope, code/configuration changes, installations, external provisioning, or test deployments require separate authorization. P00 documentation permission does not imply P01 proof-of-concept permission.

| Task   | Deliverable                                                                                                                   | Verification / exit evidence                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| I00-01 | Record baseline versions, file/worktree state, current routes, available checks, and ownership of existing changes            | Baseline record identifies prior work and preserves the original HTML/reference material                 |
| I00-02 | Maintain G01–G12 with decision owner, status, date, selected branch and dependent tasks                                       | Selected branches match dated PRD decisions; remaining open choices are not assumed                                                  |
| I00-03 | Inspect the supplied shop reference in a separate location when provided; inventory layout, assets, imports and configuration | Reference intake report maps reusable parts and gaps without overwriting the NUSC app or copying secrets |
| I00-04 | Prepare focused ADRs and a supported-version validation record                                                                | Decisions distinguish agreed direction from unverified options; record evidence links when they exist    |

**Exit gate:** prerequisites for each authorized next task are explicit. Product data, policies, credentials, or evidence that has not been supplied is recorded as missing, not fabricated.

## P01 — Prove integration and ownership boundaries

**Entry:** build/proof-of-concept work is authorized. I01-07 establishes the local/development environment contract and an authorized isolated test environment before dependent integration checks. This is a bounded feasibility exercise, not a public launch or full product build.

| Task   | Deliverable                                                                                                             | Verification / exit evidence                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I01-01 | Selected Next.js/React/Payload/database-adapter/tooling versions                                                        | A minimal app starts, builds, and exercises Payload using exact recorded versions and validation date                                                  |
| I01-02 | CMS and commerce persistence boundary proof                                                                             | Owner-scoped migrations preserve unrelated CMS/commerce/Supabase-managed structures; runtime CMS credentials cannot mutate commerce data               |
| I01-03 | Connection/pooling and separate runtime/migration credential proof                                                      | Test deployed runtime access with realistic connection configuration; avoid treating local connectivity alone as serverless validation                 |
| I01-04 | Customer/staff identity and permission proof using safe fixtures                                                        | Customer identity does not grant staff access; protected operations check verified actors and removed permissions                                      |
| I01-05 | Media upload/delivery/deletion feasibility                                                                              | Payload/editorial and commerce media references work with the selected object store; restricted objects and orphan/cleanup failure paths are exercised |
| I01-06 | Dependency and generated-contract proof                                                                                 | Browser bundles exclude privileged code/config; generated CMS contracts do not require packages to import app internals                                |
| I01-07 | Local/development environment contract, isolated proof environment, configuration inventory and named engineering owner | Reproducible setup/teardown, synthetic seed inputs, scoped credentials and explicit provisioning authorization are recorded before dependent proofs    |

**Exit gate:** record pass/fail evidence, exact versions, dated `schemaName` result or tested alternative, and remaining integration limits. A failed ownership/storage proof blocks adopting that integration; revise the implementation choice through the agreed decision process. Do not relax boundaries merely to make the spike pass.

## P02 — Establish the workspace and preserve web

**Entry:** P01 validates the selected foundations; package-manager/workspace choices are recorded.

| Task   | Deliverable                                                                                         | Verification / exit evidence                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I02-01 | Workspace configuration, authoritative lockfile, task scripts and three app entry points            | Each app can be checked/built by documented commands; no accidental mixed package-manager workflow                                                                                    |
| I02-02 | Current site moved into `apps/web` with working assets/configuration                                | Existing eight routes, legacy fragments, email/social links, content and navigation retain behavior                                                                                   |
| I02-03 | Minimal shared `ui`, `config`, and contract exports where actually reused                           | NUSC fonts/palette/crest/spacing remain consistent; avoid extracting every existing component or importing all club CSS into the store                                                |
| I02-04 | App/package dependency checks and environment configuration contracts                               | Server-only commerce/persistence stays out of client code; no shared deployment secrets or app-to-app source imports                                                                  |
| I02-05 | Per-app local commands and continuous integration entry points                                      | Shared-package changes select all consumers for checks; app builds use their own configuration                                                                                        |
| I02-06 | Authorized staging environment creation and initial preview-policy enforcement owned by engineering | Separate non-production database/auth/storage/provider settings are documented; previews cannot mutate shared/production state; feature-dependent enforcement is reverified in I08-03 |

**Exit gate:** the monorepo change is reviewable independently of new commerce features. Relevant existing functional and browser regression checks pass against the moved web app. Record a tested app-only rollback path to the previous working site; a monorepo move does not authorize deletion of user-owned source/reference work.

## P03 — Deliver staff access and the club CMS

**Entry:** P02 and relevant G04/G05 decisions; validated CMS/database/storage integration.

| Task   | Deliverable                                                                                       | Verification / exit evidence                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| I03-01 | Payload in `apps/admin`, staff login/invitation/role controls, role-specific navigation           | UF-10 and UF-17 allow intended work and deny customer/incorrect-role access, including already-open sessions after access removal |
| I03-02 | Approved structured club/news/player/fixture models and editorial media fields                    | Models cover agreed editable content without inventing dedicated team pages or collecting unapproved public personal data         |
| I03-03 | Repeatable content import with source-to-record mapping and validation report                     | Existing content is reconciled against its source; reruns do not duplicate entries; unapproved youth/media content stays private  |
| I03-04 | Draft save, protected preview, editor direct publish, authorized withdrawal and conflict handling | UF-11 preserves draft/public separation and newer edits; no administrator publication approval is added                           |
| I03-05 | Editorial asset upload/reference/replacement/deletion workflows                                   | UF-12 handles invalid uploads, referenced assets, private delivery and retryable cleanup correctly                                |
| I03-06 | Web consumption of published CMS contracts, news/fixture presentation, revalidation and metadata  | UF-01 preserves existing routes/design; drafts remain private; publication/withdrawal meets selected targets                      |

**Exit gate:** a representative editor can maintain approved content without code changes. Record comparison evidence for imported/public content and test both normal publishing and failure/withdrawal states. Keep the previous source available for a controlled content cutover; do not maintain two independently editable live sources.

## P04 — Build canonical commerce and reliable operations

**Entry:** P02, database proof, relevant catalogue/stock/permission decisions. This phase defines domain contracts before the store and staff UI depend on them.

| Task   | Deliverable                                                                                                | Verification / exit evidence                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| I04-01 | `packages/commerce-db` schema/queries/migrations and `packages/commerce` operation contracts               | CMS and commerce stay separate; product marketing data, variants and stock have one authoritative owner                                       |
| I04-02 | Product publication, opening-stock and reasoned adjustment operations, with durable sensitive-action audit | Draft/Published/Archived is distinct from availability; concurrent/stale edits do not overwrite confirmed data                                |
| I04-03 | Cart, price validation, stock reservation/expiry and order snapshot operations under G07                   | Concurrent buyers cannot oversell the same remaining stock; retries and stale carts cannot duplicate orders or silently change charged totals |
| I04-04 | Owner-authorized order access and protected staff adapters                                                 | Customers cannot fetch another customer's record; staff permissions are evaluated for each operation                                          |
| I04-05 | Chosen durable job/reconciliation foundation with one accountable execution owner                          | Reservation expiry and retryable work survive interrupted requests; duplicate claims/retries do not repeat business effects                   |

I04-03 defines the canonical commerce cart contract. Anonymous-cart identity, persistence, customer association and merge behavior follow G07 and the applicable G05 rules; they are not assumed before those decisions are settled. Test fixtures may explore a branch without selecting it for production.

**Exit gate:** domain-level tests demonstrate stock, order, actor, audit and retry invariants before real checkout is enabled. Schema snapshots and TypeScript compilation alone are insufficient evidence. Provider-specific behavior remains P06/P07 work; no fake “paid” state is used as a production shortcut.

## P05 — Build the storefront and account journeys

**Entry:** relevant P04 operations and G03/G05/G06/G07 choices; reference assets/layout are inspected. The supplied shop reference is a design/layout input, not authority over code structure, dependencies, data ownership, or security. Reuse code only after review against the frozen baselines; importing its architecture/configuration requires an explicit approved change.

| Task   | Deliverable                                                                                           | Verification / exit evidence                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I05-01 | Responsive shop catalogue, category/detail views, variant selection and sizing guidance               | UF-02 matches the approved reference and NUSC identity using valid product content; optional search/filters are not added by default                        |
| I05-02 | Cart editing, safe persistence/association, changed-price/stock review and checkout entry             | UF-03 retains permitted selections, never leaks another identity's cart, and does not silently double or replace known quantities                           |
| I05-03 | Registration/sign-in at checkout, required email verification before purchase, recovery, session expiry and sign-out | UF-04 enforces account-required checkout without requiring an earlier separate registration visit; removed/expired access cannot continue protected actions |
| I05-04 | Minimum account/profile and saved-address management, with approved deletion-request route             | UF-08 implements only the chosen D-16 scope; identity changes and shared-device behavior preserve privacy                                                   |
| I05-05 | Store-to-club navigation and web Shop entry; public/private route handling                            | Visitors can browse publicly; no guest checkout appears; private account routes are not exposed as searchable public content                                |

**Exit gate:** a shopper can browse, choose a variant, manage a cart, authenticate and resume the intended purchase with accurate state. Test empty/unavailable/error states and keyboard/phone behavior. Until P06 passes, public/live purchase capability is not presented as ready.

## P06 — Integrate delivery, payments, orders and communication

**Entry:** P05 plus approved G08/G10 and relevant stock/privacy rules. Provider test facilities and policies are available.

| Task   | Deliverable                                                                                                             | Verification / exit evidence                                                                                                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| I06-01 | Nagaland serviceability, delivery/contact form, selected address behavior, approved estimates and final INR cost review | UF-05 rejects unsupported addresses before payment and requires renewed review when totals/eligibility change                                  |
| I06-02 | Provider adapter, payment initiation/outcome handling and supported test methods                                        | UF-06 covers success, failure, pending/unknown, abandoned checkout and return; a redirect/notification does not define business state          |
| I06-03 | Verified event processing, deduplication and recovery/reconciliation                                                    | Duplicate/out-of-order events, timeouts, interrupted writes and repeat submissions cannot charge/create/fulfil the purchase twice              |
| I06-04 | Secure customer order history/detail, separate payment/fulfilment/refund states, tracking and required documents        | UF-07 displays confirmed amounts/states; Processing is recorded explicitly and Delivered has an approved confirmation source                   |
| I06-05 | Approved support entry points and transactional templates/delivery jobs                                                 | UF-07/UF-09 messages report existing state, avoid duplicate/conflicting updates and do not disclose private records to unauthorized recipients |

**Exit gate:** end-to-end test purchases cover a normal sale and consequential failure/recovery paths, with no real charge or customer messaging performed as a test without specific authorization. Confirmed orders survive notification failure. No invented tax, support, dispatch, or invoice policy is shipped.

## P07 — Deliver staff commerce workflows

**Entry:** P03 staff access and P04 commerce contracts; individual tasks additionally require their policy/provider dependencies.

| Task   | Deliverable                                                                                         | Verification / exit evidence                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| I07-01 | Commerce product screens inside admin, using commerce operations rather than Payload product copies | UF-13 shows current/new price and affected variant for intentional confirmation; stale edits require review                                         |
| I07-02 | Opening-stock/adjustment screens, reasons/results and permitted low-stock view only if selected     | UF-14 respects committed quantities and unknown outcomes; no casual live-stock overwrite                                                            |
| I07-03 | Order lookup, preparation, dispatch/tracking and approved delivery confirmation                     | UF-15 distinguishes paid/processing/dispatched/delivered; permitted mobile tasks work; duplicate actions do not repeat fulfilment                   |
| I07-04 | Order-page cancellation requests with staff review, returns and controlled refunds                        | UF-09/UF-16 show eligibility and paid/already-refunded/proposed/remaining amounts; uncertain prior refunds are resolved before overlapping requests |
| I07-05 | Audit visibility and handling of denied, expired, disabled or changed staff permissions             | UF-10/UF-17 and commerce flows deny removed operations in existing sessions; ordinary staff cannot rewrite sensitive-action history                 |

**Exit gate:** authorized staff completes product, stock, fulfilment and policy-approved refund/support rehearsals. Incorrect-role and customer requests are denied. Customer order history remains valid after product archival, customer deletion handling, and refund events.

## P08 — Validate the complete release in staging

**Entry:** required functionality from P03–P07, selected conditional branches, approved policies, real approved content/product assets and G11 targets.

| Task   | Deliverable                                                                                                               | Verification / exit evidence                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I08-01 | Integrated requirement/flow evidence for all 17 flows and applicable optional scope                                       | Acceptance matrix links results, screenshots/logs and defects to PRD/flow IDs; no required item is hidden behind a mock                                                                   |
| I08-02 | Responsive, keyboard, focus, zoom, reduced-motion and assistive-technology review                                         | Public journeys and the agreed mobile-admin subset are usable; automated checks are supplemented by manual interaction review                                                             |
| I08-03 | Contract, migration and environment isolation verification                                                                | Supported mixed app revisions remain compatible; preview permissions enforce read-only behavior or use isolated test data                                                                 |
| I08-04 | Observability, audit, jobs, provider failure and recovery rehearsals                                                      | Operators can distinguish content, checkout and staff-write readiness, find failed work, and replay safely                                                                                |
| I08-05 | Coordinated database/object restore exercise and provider reconciliation                                                  | Recovery evidence meets selected RPO/RTO; records/media align and recovery does not duplicate external effects                                                                            |
| I08-06 | Club editorial/store acceptance and policy/content reconciliation                                                         | Staff demonstrates publication and order operation; serviceability, pricing, sizing, permissions and support details match actual practice                                                |
| I08-07 | Current README, environment/setup instructions, runbooks, ADR/evidence links, selected-scope record and known limitations | Club/engineering reviewers can follow setup, support, incident and recovery instructions; no stale draft/empty-document assumptions or embedded secrets; updates are ready before release |

**Exit gate:** no unresolved critical issue can mischarge a customer, expose private data, duplicate an operation, oversell, or prevent an agreed core journey. There must be no known critical keyboard, focus, or accessibility blocker in the agreed public and mobile-admin journeys before P09. Other known issues have an owner, impact, explicit release decision, and follow-up; do not declare a passed gate solely because tests ran.

## P09 — Release and hand over, only when authorized

**Entry:** P08 acceptance evidence and accessibility gate have passed, named release/rollback authorities are recorded under G11, production dependencies/policies are ready, and production deployment/payment activation is explicitly authorized.

| Task   | Deliverable                                                                                                   | Verification / exit evidence                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I09-01 | Three Vercel projects, selected domains/canonical redirects, scoped production secrets and provider endpoints | Domains route to intended apps; preview/staging secrets cannot write production; private/admin surfaces remain protected                                                                                                           |
| I09-02 | Reviewed migration/data cutover and compatible app release                                                    | Migration execution is coordinated once; each consumer meets the supported schema/API contract                                                                                                                                     |
| I09-03 | Production smoke verification and controlled activation                                                       | Public routes, auth, content, support, product availability, order processing and provider connectivity match approved launch criteria                                                                                             |
| I09-04 | Operational handover and monitored launch record                                                              | Named staff can publish, fulfil, resolve support/refund exceptions and locate recovery instructions; release revision and known issues are recorded                                                                                |
| I09-05 | Approved final data-import manifest and ownership record before I09-02 cutover                                | Editorial owner approves content, merchandise owner approves catalogue, store manager signs off opening stock, and engineering owns execution/reconciliation; legacy customer/order migration is excluded unless separately scoped |

Any real-money transaction or message to another person during launch validation needs explicit authorization; otherwise use provider-supported non-charging checks. Production smoke checks do not replace staging evidence.

## Requirement and flow coverage

Detailed behavior remains in the frozen documents; implementation tasks consume it rather than restating business policy.

| Flow coverage      | Main delivery tasks            | Required verification emphasis                                                   |
| ------------------ | ------------------------------ | -------------------------------------------------------------------------------- |
| UF-01              | I02-02, I03-02 through I03-06  | Existing content/design, news/player/fixture states, published-only reads        |
| UF-02, UF-03       | I04-02, I04-03, I05-01, I05-02 | Variant/sizing clarity, cart identity, changed stock/price and empty states      |
| UF-04, UF-08       | I05-03, I05-04                 | Correct conditional branch, recovery, expiry, identity changes and privacy       |
| UF-05              | I06-01                         | Nagaland address eligibility and explicit final INR total                        |
| UF-06              | I04-03, I04-05, I06-02, I06-03 | Concurrency, payment uncertainty, abandonment and retry safety                   |
| UF-07              | I06-04, I06-05                 | Owned-order access, true state, required documents and notification independence |
| UF-09              | I06-05, I07-04                 | Selected cancellation/support branch and truthful acknowledgement                |
| UF-10, UF-17       | I03-01, I07-05                 | Staff identity/roles, invitation and effective permission/session removal        |
| UF-11, UF-12       | I03-02 through I03-06          | Direct publishing, protected preview, withdrawal and media lifecycle             |
| UF-13, UF-14       | I04-01, I04-02, I07-01, I07-02 | Canonical products, conflicts, price/stock review and audit                      |
| UF-15, UF-16       | I06-03, I07-03 through I07-05  | Explicit fulfilment, refund financial review, recovery and permissions           |
| All relevant flows | I08-01 through I08-07          | PRD UX-01 through UX-06 and Q-01 through Q-05; frozen flow invariants            |

No optional feature becomes Must merely because a task mentions where it would be implemented. Saved addresses, purchase email verification and cancellation initiation follow their selected branches; low-stock views, dedicated team/profile pages, search and other optional work require explicit inclusion.

## Verification strategy and evidence

Use proportionate checks at the boundary being changed. Avoid implementation-mirroring tests or repeatedly running unrelated checks without a new risk.

Test ownership follows the layer: commerce/domain packages own invariant tests; each app owns its integration and UI tests; the engineering release owner coordinates staging end-to-end evidence and club acceptance. Shared contract tests have an explicit producing/consuming owner. Reuse evidence where appropriate instead of duplicating the same assertion in every app, but do not leave cross-app behavior ownerless.

| Boundary                   | Check type                                                             | Evidence expected                                                                     |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Workspace and dependencies | Typecheck, lint, per-app production build, import/client-bundle checks | Exact commands/revisions and results; no privileged code in browser output            |
| Existing web and CMS       | Route/content regression, CMS integration and browser review           | Preserved eight-page behavior/design; correct publication/removal and media access    |
| Commerce                   | Domain/integration tests against isolated persistence                  | Concurrent last-stock purchase, repeated operations, stale edits and durable recovery |
| Auth/permissions           | Positive and negative protected-operation tests                        | Customer ownership, staff role differences, disabled/expired sessions, private media  |
| Payments/refunds           | Provider test integration and deterministic failure/retry cases        | Duplicate/out-of-order/unknown outcomes reconciled without double effects             |
| App contracts/migrations   | Consumer/provider and migration rehearsal                              | Current/previous supported deployments work; unrelated tables remain untouched        |
| Experience                 | End-to-end and manual review                                           | 17 applicable flows, errors/abandonment, public mobile and agreed mobile-admin tasks  |
| Operations                 | Failure injection, job/audit inspection and restore drill              | Bounded recovery, effective alerts, consistent data/media and named response owners   |

Existing root commands are `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and `npm run test:browser`. These are documented current entry points, not commands run during this planning task. Inspect their prerequisites when capturing the baseline. P02 will establish the actual workspace equivalents; do not invent pnpm/Turbo commands before selecting that tooling.

For every completed task, record revision, environment, exact checks, result, applicable PRD/flow IDs, evidence location, and material limits. Never mark a mock-only flow as a verified provider integration or a documented plan as completed recovery evidence.

## Seed data and import ownership

CMS test fixtures for news, players, teams/fixtures and publication states are maintained with the Payload integration by engineering with editorial review. Commerce fixtures for products, variants, stock, carts, orders and payment/refund states belong to the commerce domain test setup. Customer/staff test identities are synthetic and exercise both allowed and denied access.

Seed/import utilities must be repeatable with stable identifiers or deliberate reset behavior, have an explicit target environment, and refuse accidental production seeding. Use synthetic customer/order data in local/development; never copy production customer records, credentials or payment details into developer environments. Simulated paid/refunded test records must never be loaded into live sales data.

I03-03 owns the repeatable CMS import; I04-01/I04-03 own commerce seeds/contracts; I08-01/I08-06 reconcile representative scenarios and approved release inputs. Seeding for tests and final production loading are separate operations.

| Production data                                | Approval owner                                                      | Execution/reconciliation owner                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Final club/news/player/fixture content         | Club editorial lead, including required media/publication approvals | Engineering using the rehearsed CMS import and source-to-record report                                                        |
| Product catalogue, variants, prices and images | Club merchandise lead                                               | Engineering using approved commerce operations/import tooling                                                                 |
| Opening stock per variant                      | Club store manager, based on verified physical/available quantities | Engineering/import operator with store-manager review of resulting quantities and attribution                                 |
| Legacy customers/orders                        | No legacy commerce dataset is identified or in scope                | If one is introduced, assign data/privacy owners and separately scope migration, reconciliation and recovery before importing |

I09-05 records named owners, source version/date, selected records, expected counts, stock approval and reconciliation checks before I09-02 executes final cutover. Final product loading and opening stock must follow owner-scoped schema deployment; rehearsed import retries must not duplicate records or reset already-committed stock. Do not invent existing customers/orders or assume the absence of supplied legacy data authorizes an unreviewed future import.

## Environments and configuration work

Implement Architecture v1's policy rather than choosing shortcuts during deployment:

- Local/development uses isolated test data and credentials. Staging has its own non-production database/auth/storage and provider test integrations.
- Ordinary Vercel previews use compatible staging APIs/read-only access with mutations actually restricted. A branch outside the compatibility window uses isolated data or a compatible mock for preview only.
- Mutating preview tests require explicit isolated backing services. Preview builds must not run migrations against staging or production.
- Production credentials, callback URLs, buckets, sending identities, provider endpoints and app secrets are scoped to their environment and purpose.
- Runtime grants and migration privileges are separate. Payload runtime mutation access does not extend to commerce just because both execute in admin.
- Document required variable names and safe examples only. Supply values through secret management; do not put credentials in these planning files or reference exports.

Provider provisioning, hosting plans, pool limits, storage recovery, scheduled execution and alert configuration are deliverables to validate, not services already installed.

Environment ownership is explicit: engineering delivers the local/dev contract and isolated proof in I01-07, staging creation and initial preview restrictions in I02-06, and environment/preview validation in I08-03. I09-01 delivers production readiness under the named release owner and authorized provisioning scope. Club operations owns agreed usage/cost/support constraints. Record named maintainers, access owners and environment inventory in G11 before each environment is used.

## Branch and release strategy

Use focused feature branches, review, staging verification, then authorized production release. This is a lightweight source-control convention, not a requirement for GitFlow or a new permanent branch hierarchy. Preserve user changes and keep each task's intended scope reviewable.

Record the app/package revision and migration set tested in staging, and identify the exact revisions promoted per app. Shared-package changes trigger checks for all affected consumers. Independent app release is allowed only inside the supported compatibility window.

Release additive migrations and compatible provider contracts before their dependent consumers; defer removals until active and rollback-candidate revisions no longer need the old shape. An incompatible app must not deploy merely because its branch merged. Phase/task evidence links the reviewed revision to staging and production records.

## Release authority and stop conditions

Before P09, G11 must contain named people, backups, contact/escalation details, and the limits of each authority. Roles below are required assignments, not invented staff names or present permissions.

| Authority                       | Required assignment / responsibility                                                                                                  | Current assignment |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Release go/no-go owner          | Club release owner accepts business readiness and authorizes activation within the agreed scope                                       | Unassigned         |
| Engineering halt/rollback lead  | May halt the release, stop unsafe mutations, and execute an approved compatible app rollback                                          | Unassigned         |
| Purchase restriction owner      | Authorized to suspend new purchases and communicate the customer impact under the incident plan                                       | Unassigned         |
| Data recovery lead              | Approves/executes database and object recovery with the relevant data owners; reconciles external side effects before resuming writes | Unassigned         |
| Operational communication owner | Coordinates support, staff instructions and approved incident messaging                                                               | Unassigned         |

Any contributor can raise a stop condition. Affected implementation or release operations must stop when evidence shows a risk of mischarging, duplicate payment, overselling, unauthorized data access, or irreversible migration damage. Preserve relevant evidence and current state; do not keep retrying a harmful operation or mark its task/phase Done.

Escalate to the recorded authority to restrict writes/purchases if authorized, investigate, and choose the recovery path. Unrelated safe/read-only investigation may continue. Do not perform a destructive restore or invent a refund/recovery policy without the required authority. Resume affected work only after the risk is understood, the corrective action is verified, and the responsible owner records the restart decision. These are future execution rules; no current incident or unsafe runtime state is asserted.

## Migration, release ordering and rollback

1. Capture a reviewable source/data baseline and the relevant backups before a cutover. Use synthetic/anonymized data for trials.
2. Rehearse owner-scoped migrations and content imports against isolated data. Check counts, identifiers, relationships, required fields and rerun behavior, not only migration exit codes.
3. Introduce backward-compatible schema/API changes before dependent consumers. Coordinate CMS/commerce migration execution through the release workflow, not independently on app startup.
4. Deploy compatible providers/consumers in the tested order. Keep currently supported and rollback-candidate app revisions working during the compatibility window.
5. Import/reconcile approved records and switch the authoritative content source deliberately. Do not leave project files and CMS as competing editable live content.
6. Run scoped post-release checks before broader activation. Retire old fields/contracts only after no active or rollback-candidate deployment depends on them.

App rollback and database recovery are different actions. An app rollback must use a schema-compatible revision; prefer a reviewed forward fix for data/schema faults rather than a blind down migration. Restrict new writes/purchases when necessary to avoid compounding a failed cutover, while retaining safe public content and existing-order status/recovery.

For a restore, coordinate PostgreSQL and object storage, inspect operations after the restore point, and reconcile provider payments/refunds/shipments before replaying work or reopening sales. Notification replay must not repeat payment, stock, or fulfilment effects. Recovery owner, decision authority, RPO/RTO, maintenance messaging, and exact runbook steps must be set and rehearsed before P09.

## Task readiness and completion

A task becomes **Ready** when implementation is authorized, its relevant decisions/assets/contracts are available, its test environment is safe, and its deliverable/acceptance evidence are understood. Not every business decision must block every task, but a dependency cannot be bypassed with a production assumption.

A task becomes **Done** only when:

- Its scoped deliverable exists and meets the linked PRD/User Flow requirements.
- Relevant positive, failure and permission checks pass; evidence and limitations are recorded.
- It respects frozen ownership, dependency and deployment boundaries.
- Any affected consumer, migration, configuration and operational documentation is updated.
- No required unresolved branch is hidden behind a default or a mock.
- Review findings are resolved or explicitly accepted within release criteria.

Document freeze, task completion, phase acceptance and production launch are separate states. Implementation Plan v1 freezes the delivery baseline, not task progress or unresolved choices. No code work is marked Ready or Done by this freeze.

## Progress record and next planning step

| Item                             | Current record                                                               |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Frozen inputs                    | Architecture v1, PRD v1, User Flows v1                                       |
| Backend/platform build authorization | Not provided; frontend-only store preview was authorized separately         |
| Implementation phases            | P00–P09 Planned                                                              |
| Completed backend/platform tasks | None                                                                         |
| Store reference and missing inputs | Shop reference ZIP supplied for frontend preview; official catalogue/assets and launch policies remain missing |
| Selected customer branches | D-15 verified email before purchase; D-16 saved-address management; D-17 order-page request with staff review. Recorded 14 September 2026. |
| Evidence from this planning edit | Document consistency/reference checks only; no application or provider tests |

The core planning set is now frozen at v1: architecture, product requirements, user flows, and this implementation plan. ADRs remain ongoing. The next work is decision resolution, supporting ADRs, and separately authorized execution, not another major planning document.

Documentation-only P00 preparation may proceed when requested. The separately authorized frontend-only workspace/store-preview realignment does not complete the full platform phases, backend proof, provider validation, or production readiness gates. Once backend/platform work is separately authorized, start the applicable P00/P01 evidence tasks and the smallest authorized proof that resolves the next technical uncertainty. Record concrete decisions and artifacts as they arrive. Do not install services, send messages, charge payments, or deploy simply because their tasks are listed here.
