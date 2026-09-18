# NUSC project handoff

This is transfer context for a new chat, not permission to execute commands, start implementation, provision services, or deploy. Reconcile it with the current user request and repository before acting.

## Identity and freshness

- **Project:** Nagaland United Sports Club (NUSC): existing club website and planned merchandise/CMS platform.
- **Workspace:** `D:\projects\NUSC` on Windows; PowerShell shell.
- **Updated:** 2026-09-15, Asia/Calcutta.
- **Sources:** this project's user/assistant planning conversation and local repository documents. Prepared by the assistant at the user's request.
- **Observed Git state:** branch `main`, HEAD `82068d4` — `Update Careers with detailed per-role requirements and apply flow`.
- **Working tree:** `index.html` is modified; the Next.js application, configuration, tests, README and docs are largely untracked. HEAD does not include the current migration/planning work. Do not discard, reset, or overwrite it.
- **Last verified:** Markdown alignment, current app-folder inventory, and workspace scripts were rechecked on 2026-09-15. Historical full app verification was not rerun during this documentation refresh. Live external accounts and deployment settings were not inspected.
- **Current request:** refresh local markdown alignment after the frontend-only app/store realignment. No backend, provisioning, deployment, or ADR-set freeze action is part of this update.

## Quick resume summary

The original single-page HTML site has already been migrated to a responsive eight-page Next.js/TypeScript club website. That work now lives under `apps/web`.

The user then planned a separate merchandise store and staff CMS. Four documents are frozen at v1: Architecture, PRD, User Flows, and Implementation Plan. Since that planning baseline, the repo has been realigned into `apps/web`, `apps/store`, and placeholder `apps/admin`, and a frontend-only store landing preview has been started from the supplied ZIP reference. The CMS, commerce backend, Supabase/Payload integration, payments, order handling, provisioning, and deployment remain **not** authorized and not implemented.

The intended platform is one monorepo containing `apps/web`, `apps/store`, and `apps/admin`, with one shared Supabase-hosted PostgreSQL database per environment. Payload owns club CMS data; commerce owns products/orders/stock. Customers use Supabase Auth; staff use Payload Auth. The store launches for **Nagaland only**, charges in **INR**, and requires an **account before checkout**. Content editors **publish directly**; administrators manage permissions.

Resume update, 14 September 2026: the user asked to continue and confirmed Implementation Plan v1 is ready to be frozen; its existing frozen status was verified. Six supporting ADRs now document the agreed architecture. The user resolved D-15/D-16/D-17 as recorded below and in PRD/User Flows/Implementation decision revision 1.

Repo update, 15 September 2026: the user authorized frontend-only implementation of the shop landing page from `NUSC-shop-reference.zip`, with no backend/provisioning/deployment. The repo was then realigned to the agreed app folders before deeper store work. The shop reference has been used as a design/layout input only; official catalogue data, pricing, stock, product photos, policies, providers, and backend evidence remain outstanding.

**Latest completed work:** the markdown set was reviewed for alignment with the realigned workspace. Current-state wording was refreshed where it still described the pre-realignment root app or missing shop reference. This did not change frozen product decisions, backend scope, provider validation state, or production authorization boundaries.

**ADR status:** the set is ready to freeze following those corrections. Individual records currently say **Accepted direction, inherited from Architecture v1**. A separate ADR-set freeze has not been recorded; do not describe it as already frozen. The latest request is this handoff, not a new architecture review or build request.

## Read these documents in order

| Document                                                 | State and purpose                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                     | Frozen Architecture v1: app/runtime boundaries, ownership, dependencies, auth, data, environments, recovery         |
| [PRD.md](./PRD.md) | Frozen PRD v1 with decision revision 1, 14 September 2026: D-15/D-16/D-17 agreed; saved-address management is Must |
| [USER-FLOWS.md](./USER-FLOWS.md) | Frozen User Flows v1 with decision revision 1: 17 flows; D-15/D-16/D-17 branches marked Selected; remaining conditional/optional scope identified |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Frozen Implementation Plan v1 with decision revision 1: P00–P09, 55 tasks, G01–G12, selected customer branches and remaining gate dependencies |
| [ADR index](./adr/README.md) | Six supporting ADRs now exist for agreed Architecture v1 decisions; integration validation remains outstanding |
| [verification.md](./verification.md)                     | Historical 2026-09-10 checks for the existing club-site migration                                                   |
| [migration-architecture.md](./migration-architecture.md) | Earlier migration notes; later CMS/store planning supersedes their file-content-only direction                      |
| [README.md](../README.md)                                | Current workspace instructions for `apps/web`, `apps/store`, and placeholder `apps/admin`                           |

Frozen means the agreed baseline is settled. It does not turn an explicitly Proposed/Open/Conditional item into an accepted decision. A new product decision should be recorded deliberately; architectural changes use ADRs. Do not rewrite the four documents wholesale or create another major planning document without a concrete reason.

Some frozen documents contain historical planning language. Use the current files and this handoff for current-state facts; do not infer missing work from stale prose.

## Explicit preferences and constraints

- Preserve NUSC's existing look, fonts, colors, spacing, crest and identity across the public experiences.
- Preserve existing public routes/content/interactions during the monorepo move. The main site's Shop link will go to a shop subdomain.
- Backend/platform work remains paused. Earlier continuation confirmed the Implementation Plan v1 freeze and resolved D-15/D-16/D-17. Later authorization covered only frontend-only app/store realignment and landing-page work. No Supabase/Payload proof, provisioning, payments, order handling, or deployment authorization was given.
- Treat the current project `.md` documents as the source of truth. The latest ADR correction request was scoped to ADR-005 and the ADR README; the user said ADR-001/002/003/004/006 were ready as-is. Do not restart their review or rewrite them without a concrete new reason.
- Supabase/Payload is the selected direction, subject to compatibility validation; no exact new platform versions/provider choices are silently approved.
- Actual shop content must come from the club: products, prices, stock, images, sizing, delivery rules and policies. Do not invent live merchandise or operating promises.
- The supplied shop reference export is a design/layout input. Do not import its architecture, dependencies, environment files or configuration wholesale.
- Existing `index.html` changes predate this work. Preserve original/source reference material and other uncommitted changes.

## Decisions and rationale

| Decision                                             | Reason / boundary                                                                 | Source and revisit rule                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| One monorepo, three apps                             | Shared branding/contracts with independent public, commerce and staff deployments | Architecture v1; structural changes require ADR                                         |
| `web`, `store`, `admin` naming                       | Clear application roles                                                           | Frozen architecture and implementation plan                                             |
| Root or `www` → web; `shop` → store; `admin` → admin | Separate audiences while keeping one club domain                                  | Actual domain and canonical root/`www` choice are open                                  |
| One shared PostgreSQL database per environment       | Central persistence with explicit domain ownership                                | Logical separation mandatory; physical schemas preferred only after validation          |
| Payload in `apps/admin`                              | Hosts Payload Admin, CMS APIs, staff auth and custom commerce screens             | Not an unrelated frontend or an assumed fourth backend                                  |
| Commerce shared server library                       | Store/admin execute the same rules through authorized operations                  | `packages/commerce`; not a separately running service                                   |
| Commerce persistence in `packages/commerce-db`       | Makes non-Payload ownership explicit                                              | Earlier proposed name `packages/database` is superseded                                 |
| Customer/staff identity split                        | Supabase Auth customers; Payload Auth staff                                       | Unified SSO is not selected; app roles/sessions do not merge automatically              |
| Nagaland-only, INR                                   | Explicit user answer                                                              | PRD D-01 agreed; exact postcode coverage/charges open                                   |
| Account required before checkout                     | Explicit user answer                                                              | PRD D-02 agreed; registration can be offered at checkout entry under the baseline flows |
| Editors publish directly                             | Explicit user answer                                                              | PRD D-03 agreed; no added administrator publication approval step                       |
| Verified email before purchase | Explicit user answer, 14 September 2026 | PRD D-15 agreed; verification mechanics remain open |
| Saved-address management in v1 | Explicit user answer, 14 September 2026 | PRD D-16 agreed; customer ownership, explicit saving, current serviceability checks, and historical order snapshots preserved |
| Order-page cancellation requests for staff review | Explicit user answer, 14 September 2026 | PRD D-17 agreed; request acknowledgement/pending review and duplicate protection required; no automatic cancellation/refund |

Payload owns news, players, manually maintained fixtures/results, pages and editorial media metadata. Commerce owns canonical product marketing content, variants, prices, stock, carts, orders and customer application profiles. Auth credentials/sessions are separate from customer business data. Media files belong in object storage; Supabase Storage is preferred pending integration proof.

CMS runtime credentials must not mutate commerce tables by default. Staff commerce screens call commerce operations with commerce persistence privileges. Each owner has scoped migrations coordinated during releases. Shared packages never import app internals or ship privileged code/secrets to browsers.

No fourth backend deployment, production database, commerce provider integration, or object-storage setup has been implemented in this work.

## ADR records and latest review

| Record | Subject | Latest state |
| --- | --- | --- |
| [ADR-001](./adr/001-three-app-monorepo.md) | Three-app monorepo | User said ready as-is; unchanged in final review |
| [ADR-002](./adr/002-supabase-postgresql.md) | Shared Supabase PostgreSQL per environment | User said ready as-is; unchanged in final review |
| [ADR-003](./adr/003-payload-cms.md) | Payload in admin | User said ready as-is; unchanged in final review |
| [ADR-004](./adr/004-domain-ownership.md) | CMS/commerce ownership | User said ready as-is; unchanged in final review |
| [ADR-005](./adr/005-customer-staff-identity.md) | Customer/staff identity split | Reconciled wording and direct links to selected product branches and remaining dependencies |
| [ADR-006](./adr/006-commerce-runtime.md) | Shared commerce library, no fourth backend | User said ready as-is; unchanged in final review |
| [ADR README](./adr/README.md) | Index, status, and source references | Added a three-decision table with exact flow links; clarified rationale wording and unresolved details |

The review concern that the sources still treated D-15/D-16/D-17 as open was checked against the actual files. It was superseded by the existing decision revision 1 records. Preserve the user's selected answers; do not revert them to Open because of that earlier review premise.

The source chain is [PRD decision register](./PRD.md#10-business-decisions-and-proposed-defaults) → [selected verification](./USER-FLOWS.md#d-15-selected-verification-branch), [selected addresses](./USER-FLOWS.md#d-16-selected-address-branch), and [selected cancellation](./USER-FLOWS.md#d-17-selected-cancellation-branch) → [implementation branch resolutions](./IMPLEMENTATION.md#customer-branch-resolutions--14-september-2026). G06/G09 are not complete: method, address/serviceability/privacy, and cancellation/refund policy details still need resolution.

## Current code and design

| Area                 | Current location / detail                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Public routes        | `/`, `/club`, `/honours`, `/pathway`, `/community`, `/partners`, `/careers`, `/contact` in `apps/web/src/app/` |
| Web layout/fonts     | `apps/web/src/app/layout.tsx`; Barlow Condensed and Inter through `next/font/google`                         |
| Web styles           | `apps/web/src/app/globals.css`; custom CSS, not a Tailwind implementation                                    |
| Club content         | `apps/web/src/content/site.ts`, `collections.ts`, `pages.ts`                                                 |
| Shared/current UI    | `apps/web/src/components/navigation.tsx`, `page-header.tsx`, `page-effects.tsx`, `rich-text.tsx`, and `sections/` |
| Crest                | `apps/web/public/crest.png` and `apps/store/public/crest.png`, extracted from the original site              |
| Store preview        | Frontend-only landing page in `apps/store/src/app/page.tsx`; carousel in `apps/store/src/components/shop-hero-carousel.tsx` |
| Store test imagery   | Synthetic/non-official preview images in `apps/store/public/shop/`                                           |
| Functional checks    | `tests/routes.test.mjs`                                                                                  |
| Browser checks       | `tests/browser/site.spec.ts`, `playwright.config.ts`                                                     |
| Current dependencies | Next.js 16.3.4, React/React DOM 19.3.0, TypeScript 5.9.3; npm lockfile                                   |

Design anchors: Barlow Condensed for large uppercase headings/titles/statistics; Inter for body, navigation and buttons. Main colors include navy `#050f24`, `#081936`, `#0c2249`; red `#e31f2b`; white; light paper `#eef2f8`. The main container is 1220px, with approximately 22px desktop / 16px mobile gutters. Keep the sunburst/crest motifs, Rise Together hero, achievement ticker, snapshot and established section spacing. Responsive/accessibility fixes were part of the earlier migration.

There is no `apps/` monorepo structure or implemented CMS/store yet. Do not confuse target folders shown in documents with existing code.

## Evidence and completed work

| Claim                                                                      | Evidence/date                                                                   | Limits                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Eight-page club migration exists | Current source inventory and prior handoff; implementation predates this resumed chat | Current working tree is uncommitted; no claim that HEAD contains it |
| Earlier build, lint and typecheck passed                                   | `docs/verification.md`, 2026-09-10                                              | Historical results, not rerun for this handoff                                                             |
| Five route/content tests and four browser tests passed                     | Same report; Chromium/Playwright                                                | No physical-device or all-browser coverage; tests did not send emails or applications                      |
| Responsive checks at 320/390/768/1366 widths                               | Same report and prior browser review                                            | Generated screenshots may be under ignored `artifacts/`; recheck availability                              |
| Four planning baselines frozen                                             | Document version/status headers and explicit user approvals                     | Open choices remain open; freeze does not authorize execution                                              |
| Final implementation plan has 10 phases, 55 tasks and coverage of 17 flows | Documentation checks on 2026-09-14                                              | Reference/format/structure checks only, not app/provider validation                                        |
| Six supporting ADRs exist; three customer branches are selected | Documentation checks on 2026-09-14: 51 local links, 17 flows, 55 unique tasks, 10 Planned phases, six ADRs | Earlier check before final ADR wording refinement; no runtime verification |
| Final ADR-005/README corrections are consistent with source decisions | 24 local links/anchors, source-selection assertions, and whitespace checks passed on 2026-09-14 | Only those two files were edited in the final ADR review |
| Final ADR review preserved the other five ADRs and three source documents | Before/after SHA-256 comparison on 2026-09-14 | No application or provider tests rerun; earlier continuation also verified code and Architecture v1 unchanged |
| No deployment performed in this work                                       | Earlier verification report and session action history                          | Current external Vercel/account state was not inspected; do not assert that no deployment exists elsewhere |

Current root scripts are `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:browser`. Read prerequisites before using them. The observed historical runtime was Node.js 22.13.1; current process/server status is unknown. Do not assume the old localhost server is still running. Workspace commands will be chosen in P02, not guessed now.

No current app defect or failed platform integration is established by the planning work. More precisely, the future platform has not been built or tested. Documentation validation is not evidence that Payload/Supabase/custom-schema/storage combinations already work.

## Active state and unresolved decisions

**Current resumed state, 14 September 2026:** documentation-only continuation. Six ADRs are written, and D-15/D-16/D-17 are recorded in PRD/User Flows/Implementation decision revision 1. P00–P09 remain Planned; no new platform implementation task is Done. I00-04 is not complete: its supported-version validation record and required evidence remain outstanding. No evidence folders or platform code were created.

**At export:** the requested ADR corrections are complete and the set is ready to freeze; no explicit ADR-set freeze was recorded. This handoff is the only active deliverable. No current failed app test or integration defect has been established, and no live service state was inspected.

The earlier handoff listed three unanswered questions. Explicit user replies on 14 September 2026 supersede that state:

| Decision | Selected answer, 14 September 2026 | Remaining boundary |
| -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| D-15 | Require email verification before purchase | Verification method, screen placement, resend/recovery mechanics remain open; server-side purchase enforcement required |
| D-16 | Include saved-address management in v1 | Owned add/edit/select/remove with explicit saving, current serviceability checks, and historical order snapshots preserved |
| D-17 | Submit a request from the order page for staff review | No automatic cancellation/refund; eligibility, time limits, and refund policy remain D-08 inputs |

Other inputs are grouped in PRD D-04 through D-14 and Implementation G01–G12: shop export and real catalogue; payment/shipping providers; Nagaland serviceability and charges; taxes/invoice/receipt requirements; cancellation/return/refund policy; stock/reservation rules; support/notification channel; player/fixture/editing scope; English/IST defaults; staff permissions/MFA/privacy; tooling/versions; storage; environment/domain setup; budget/owners/performance/recovery targets.

The three customer branches above are selected and required in v1; the saved-address capability is now Must. Other optional features remain unselected. Low-stock staff views, product search, extra filters and dedicated team/profile pages must not quietly become launch blockers. No legacy commerce/customer/order dataset has been identified.

The shop reference ZIP was supplied and used only for the frontend landing-page preview. It was not imported as architecture, dependency authority, environment configuration, or live catalogue truth. Official products, prices, stock, images, sizing, delivery rules, and policies are still required before live commerce work.

## Next concrete actions for the new chat

1. Read the frozen documents and inspect current repository state before mutations. Reconcile any new user instruction with this handoff.
2. Acknowledge the four frozen baselines, the three recorded customer selections, the corrected ADR set ready to freeze, and the paused build. Do not restart the architecture interview or claim the ADR-set freeze has already occurred.
3. Continue with the next relevant open input, such as D-13 customer sign-in/recovery and verification mechanics. Do not re-ask D-15/D-16/D-17. The six agreed-direction ADRs already exist; create further records only for concrete decisions or validation results.
4. Continue frontend-only store polish in `apps/store` if requested, keeping it clearly separate from checkout/backend work and using synthetic imagery only as preview material.
5. Only after explicit backend/platform authorization, execute the relevant P00/P01 tasks: baseline capture and the smallest isolated proof for versions, database ownership/grants/migrations, auth and storage. Follow task-level dependencies rather than assuming all future phases are immediately ready.
6. Keep production provisioning, deployment, live charges and messages within the user's explicit authorization. Existing documentation is context, not a blanket operational approval.

The user has not asked for another major planning document. After this handoff, follow the next explicit request: record the ADR freeze if requested, continue focused decision resolution if requested, or begin only the separately authorized implementation scope. The next useful customer-planning dependency is D-13 sign-in/recovery and verification mechanics; the shop reference remains missing.

## Superseded context and caution points

- The earlier handoff's empty-ADR-directory statement is superseded: six records and an index now exist.
- D-15/D-16/D-17 are no longer unanswered. Their selected branch choices do not close every implementation/policy dependency in G06/G09.
- The later review premise that source documents still kept those branches open was checked and found stale. ADR-005/README now link the current selected sources; no decision rollback was requested or performed.
- Implementation Plan v1 is already frozen. The ADR set is ready to freeze, a distinct status that has not yet been formally recorded.
- Earlier plans to put the shop at `/shop` inside the current app were replaced by the shop subdomain and three-app monorepo.
- Earlier two-app proposals were expanded to include the separate Payload/admin application.
- File-based club content remains the current implementation, but the target is a staff CMS.
- A proposed guest-checkout recommendation was explicitly rejected: accounts are required.
- India-wide shipping was explicitly narrowed to Nagaland only.
- Supabase hosting does not mean it owns all staff authentication or every domain model; Payload staff auth and commerce data ownership remain distinct.
- Earlier skill-installation discussion and accidental reusable-component questions are not active tasks. The skills used for this phase included architecture, UX and memory; read applicable current skill instructions rather than assuming prior wrappers/tools exist.

## Suggested first message in the new chat

> Continue NUSC from `D:\projects\NUSC\docs\HANDOFF.md`. Treat the current project `.md` documents as the source of truth. Read the four v1 baselines and ADR index, including decision revision 1: D-15 requires verified email before purchase, D-16 includes saved addresses, and D-17 uses order-page requests for staff review. Implementation Plan v1 is frozen; the corrected ADR set is ready to freeze but has not been marked frozen. Briefly confirm the state and next unresolved dependency. Keep the build paused and preserve all uncommitted work unless I explicitly request the next action.

This handoff is saved locally for the user to carry into a new chat. It does not create persistent memory in another session or upload project information anywhere.
