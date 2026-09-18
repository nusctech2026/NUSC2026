# NUSC platform product requirements

Version: PRD v1.

Status: frozen product baseline for agreed scope; proposed defaults and open launch policies remain explicitly identified. Implementation is not authorized.

Last updated: 14 September 2026.

Decision revision: 1, recorded 14 September 2026 from explicit user answers. D-15 requires verified email before purchase; D-16 includes saved-address management in v1; D-17 uses an order-page cancellation request reviewed by staff. These resolve existing v1 branches. Other open decisions remain open; implementation is not authorized.


Architecture baseline: [frozen Architecture v1](./ARCHITECTURE.md).

This document defines what Nagaland United Sports Club's website, store, and staff dashboard should deliver. It carries forward agreed product goals, proposes a first-release scope, and identifies business decisions still needed. It does not authorize a build, service provisioning, payment activation, or deployment.

## 1. Decision status and document boundaries

- **Agreed**: explicitly accepted in project discussions or constrained by Architecture v1.
- **Proposed**: recommended first-release behavior, subject to product review.
- **Open**: requires a club decision or verified operational information; no default is silently approved.
- **Deferred**: proposed exclusion from the first release, revisitable through a scope decision.

The v1 baseline freezes agreed product direction. Proposed refinements remain recommendations until accepted; open policies must be resolved by their listed owners. Freezing the document does not approve unanswered business decisions or authorize implementation. Record later scope/policy decisions with date and status, update affected requirements and user flows, and version material scope changes. No user research or production measurement is claimed.

[ARCHITECTURE.md](./ARCHITECTURE.md) owns technical boundaries; this PRD owns product behavior and business policy. [USER-FLOWS.md](./USER-FLOWS.md) will describe screen-by-screen customer and staff journeys. [IMPLEMENTATION.md](./IMPLEMENTATION.md) owns build tasks and sequencing. Those documents' earlier references to an empty PRD describe their state when written; the frozen architecture has not been edited for this PRD.

## 2. Problem and product goals

NUSC's current site presents club information across eight pages, with content maintained in project files. Staff need an editing interface to keep news, player information, fixtures, and club content current. Supporters also need an official place to browse and buy NUSC football kits and accessories.

The product should:

1. Preserve the recognizable NUSC website while making routine content updates possible without code changes.
2. Help supporters and prospective players find current club information.
3. Let shoppers select suitable merchandise, understand the full cost, pay, and obtain a reliable order record.
4. Give authorized staff the tools to publish content and operate merchandise sales.
5. Make errors, pending payments, unavailable stock, and fulfilment status understandable and recoverable.

No sales target, catalogue size, launch date, or staffing capacity has been established. These must not be invented to justify scope or launch readiness.

### Release objective

The first release is successful when NUSC staff can maintain approved club content and merchandise operations, while supporters can browse the club site and complete a reliable Nagaland-only merchandise purchase using an authenticated account.

## 3. Audiences and success conditions

| Audience                             | Primary need                                              | Successful outcome                                                                       |
| ------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Supporter                            | Follow the club and buy merchandise                       | Finds current information and completes or confidently tracks a purchase                 |
| Prospective player                   | Understand the club and player pathway                    | Finds relevant development information and a usable enquiry route                        |
| Prospective partner or job applicant | Find opportunities and contact instructions               | Reaches the existing partnership/careers information and can act on it                   |
| Shopper/customer                     | Select the right kit or accessory and understand delivery | Knows the chosen variant, total cost, order reference, and next step                     |
| Content editor                       | Maintain club content                                     | Saves, previews, and publishes or submits content within assigned permissions            |
| Store manager                        | Maintain products and fulfil purchases                    | Finds an order, verifies its state, and performs allowed stock/fulfilment actions        |
| Administrator                        | Control staff access                                      | Grants and revokes permissions without bypassing product rules or exposing customer data |

These audience needs are inferred from project discussions, not a completed user study.

## 4. Agreed baseline

| Area                  | Agreed direction                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Public website        | Retain Home, Club, Honours, Player Pathway, Community, Partners, Careers, and Contact                                                           |
| Home identity         | Keep the Rise Together hero, achievement ticker, club snapshot, and previews of detailed pages                                                  |
| Design                | Preserve Barlow Condensed, Inter, the navy/red/white palette, crest, motifs, and established spacing                                            |
| Content editing       | Add a CMS for news, player information, fixtures, and club content                                                                              |
| Store                 | Support browsing and purchasing NUSC kits and accessories on the shop subdomain                                                                 |
| Launch market         | Deliver within Nagaland only; price and charge in INR                                                                                           |
| Checkout identity     | A customer account and sign-in are required before checkout                                                                                     |
| Publishing            | Content editors publish directly; administrators manage permissions                                                                             |
| Staff experience      | Separate admin subdomain with content and commerce management and role-based permissions                                                        |
| Technical constraints | Three apps in one monorepo, one shared PostgreSQL database per environment, Payload CMS, Supabase services, and explicit CMS/commerce ownership |
| Build status          | Planning only; Architecture v1 remains frozen                                                                                                   |

Real photography and official product data are not yet supplied. Existing club initials and branded graphics can remain where previously approved. Store products must not go live with invented prices, stock, claims, or misleading substitute imagery.

## 5. First-release scope and priorities

Priority describes delivery importance, not approval status: **Must** is required for the agreed release outcome; **Should** is valuable but may be postponed with an explicit scope decision; **Could** is optional and does not block launch; **Deferred** is excluded from the intended v1 scope. Priorities attached to proposed features remain proposed.

### Agreed first-release scope

| Area                    | Agreed outcome                                                          | Priority |
| ----------------------- | ----------------------------------------------------------------------- | -------- |
| Existing club website   | Preserve the eight public pages, existing interactions, and NUSC design | Must     |
| News and player content | Staff can maintain club news and player information                     | Must     |
| Fixtures                | Staff-managed fixture information is available publicly                 | Must     |
| Merchandise             | Support browsing and purchase of NUSC kits/accessories                  | Must     |
| Delivery and pricing    | Nagaland-only delivery, prices and payments in INR                      | Must     |
| Customer identity       | Account and sign-in required before checkout; no guest checkout         | Must     |
| Staff publication       | Content editors publish directly; administrators manage permissions     | Must     |
| Staff administration    | Content and commerce management within assigned role boundaries         | Must     |

### Proposed first-release scope

| Area                                        | Proposed detail                                                                               | Priority                              | Decision still needed                                           |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------- |
| News presentation                           | News listing and stable article pages                                                         | Must                                  | Final approved content and layout                               |
| Player presentation                         | Reuse editable player information in existing club/player sections                            | Must                                  | Approved public fields and covered players                      |
| Team references                             | Minimal team label/assignment needed by players and fixtures                                  | Must if more than one team is covered | Which squads are in scope; no public team page implied          |
| Dedicated team/player pages                 | Separate team hub and individual profile pages                                                | Could                                 | Explicit page scope; not a launch prerequisite                  |
| Fixture/results presentation                | Upcoming fixtures plus manually entered results for the launch season, including venue/status | Must                                  | Season, covered teams, and data completeness                    |
| Competition filtering and season navigation | Optional filters/grouping if the supplied dataset warrants them                               | Could                                 | Dataset and navigation needs                                    |
| Catalogue/cart                              | Product listing/detail, category browsing, variants and quantities                            | Must                                  | Real catalogue, sizes, stock, and reference layout              |
| Customer order tracking                     | Order history/status and carrier tracking when available                                      | Must                                  | Status vocabulary and fulfilment process; no live-map tracking  |
| Staff operations                            | Product/stock editing, order lookup, fulfilment, controlled refund support                    | Must                                  | Role permissions and operational policies                       |
| Notifications/support                       | Defined transactional events and a staffed support channel                                    | Must                                  | Channel, sender, response expectations                          |
| Low-stock view                              | Staff-only list using a configured threshold                                                  | Should                                | Threshold and staff ownership; no automatic email alert assumed |
| Product search                              | Search for larger catalogues                                                                  | Could                                 | Demonstrated catalogue/reference need                           |

## Out of scope for v1

| Exclusion                                                                   | Status            | Priority |
| --------------------------------------------------------------------------- | ----------------- | -------- |
| Delivery outside Nagaland; guest checkout                                   | Agreed exclusion  | Deferred |
| Kit personalization; preorders/backorders; cash on delivery                 | Proposed deferral | Deferred |
| Discount codes, gift cards, wishlists, reviews, loyalty, subscriptions      | Proposed deferral | Deferred |
| Ticketing, memberships, multilingual publishing, dedicated mobile app       | Proposed deferral | Deferred |
| Live scores, external fixture ingestion, complete historical results import | Proposed deferral | Deferred |
| Free-form page builder, custom analytics dashboard, marketing automation    | Proposed deferral | Deferred |

Visitors may browse without an account. Changes to exclusions require a product scope decision rather than appearing implicitly in a wireframe or implementation task.

## 6. Public information architecture

| Surface       | Pages or entry points                                                                                                | Notes                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Web           | Existing eight routes                                                                                                | Preserve current URLs and legacy fragment handling                                                 |
| Web additions | News list/article, fixtures/results, player/team information                                                         | Proposed paths: `/news`, `/news/[slug]`, `/fixtures`; player/team paths require a content decision |
| Store         | Catalogue, product detail, cart, registration/sign-in, account recovery, checkout, customer orders, policies/support | Exact paths and layout to follow the supplied reference and user flows                             |
| Admin         | Sign-in, editorial areas, product/inventory areas, orders, permitted staff settings                                  | Role-specific navigation; no public staff signup                                                   |

The main website links to the store, and the store offers a clear route back to the club website. Adding news and shop entry points must preserve usable navigation at narrow widths. A shop reference ZIP has since been supplied and used for a frontend-only landing preview; it does not approve live catalogue data, backend behavior, or forcing its header/footer onto the club website.

## 7. Website and CMS requirements

The following requirements are proposed elaborations of the agreed CMS goal.

| ID     | Requirement                                       | Priority | Acceptance criteria                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WEB-01 | Preserve existing public content and interactions | Must     | All eight current routes remain accessible; approved club content, email/social links, and legacy destinations continue to work                                                                                                                                                           |
| WEB-02 | Preserve the club's visual identity               | Must     | Barlow Condensed headings, Inter text, existing crest/palette, Rise Together opening, and section rhythm remain recognizable on phone and desktop                                                                                                                                         |
| WEB-03 | Publish news                                      | Must     | A visitor can browse published articles and open a stable article URL; title, date, content, and available imagery display correctly; drafts are not public                                                                                                                               |
| WEB-04 | Present player information                        | Must     | Approved player information remains consistent across existing sections; team labels are included where relevant; missing optional details do not break cards. Dedicated team/profile pages are optional and require a separate scope decision.                                           |
| WEB-05 | Present fixtures and results                      | Must     | Under the proposed launch scope, visitors can see upcoming fixtures and launch-season results with competition, team/opponent, known venue, date/time in labelled IST, and postponed/cancelled/TBC status; no invented scores or dates; optional filters are not required for acceptance. |
| WEB-06 | Handle missing and withdrawn content              | Must     | Empty news/fixture lists explain their state; unknown or withdrawn pages show a useful unavailable/not-found result rather than unrelated content                                                                                                                                         |
| CMS-01 | Edit approved club content without code changes   | Must     | Authorized staff can update agreed fields for existing pages, news, players, fixtures, honours, sponsors, and careers, with team labels where applicable. Optional dedicated team pages are not implied; layout changes remain outside routine editing                                    |
| CMS-02 | Save and preview work                             | Must     | A saved draft persists and has a protected preview; saving does not silently publish; invalid required fields show actionable errors without losing other entered values                                                                                                                  |
| CMS-03 | Control publication                               | Must     | Content editors can publish directly without administrator approval; administrators control permissions; unpublish and other editorial actions follow the final role matrix; public content reflects successful publication within an agreed freshness target                             |
| CMS-04 | Manage editorial media                            | Must     | Staff can upload supported images, supply meaningful alt text where needed, and choose approved media; errors explain invalid uploads; deletion of referenced assets is handled explicitly                                                                                                |
| CMS-05 | Maintain accurate operational content             | Must     | Staff can close a career opening or update a fixture status without editing code; date-sensitive content and deadlines are verified before launch                                                                                                                                         |
| CMS-06 | Restrict editorial data                           | Must     | Content editors cannot obtain customer/order data through the dashboard or direct requests solely because they have staff access                                                                                                                                                          |

Proposed editorial fields: news title/slug/excerpt/body/date/media; player display name/role/team and approved biography/photo; team name/category; fixture teams/competition/date/time/timezone/venue/status/result. These are content requirements, not database schemas. Public personal details, youth-player information, image permissions, and consent procedures require club review.

### Fixture, team, language, and timezone defaults

Proposed v1 presentation includes both upcoming fixtures and completed results for the club-approved launch season. Show opponent, relevant NUSC team, competition, date, kickoff time when confirmed, venue when known, and match status. Past results are manually entered; importing a full historical archive is deferred. Venue or time that is not confirmed is explicitly marked to be confirmed rather than guessed.

Competition filters, cross-season navigation, dedicated team pages, and individual player pages are optional scope decisions. A minimal team assignment can support records without requiring a public multi-team directory.

Proposed v1 language is **English**. Display fixture times in **India Standard Time (IST)** with a visible timezone label; do not silently convert to a visitor's timezone. Other dates should use unambiguous formatting. These defaults require product acceptance under D-11 before user flows are finalized.

Fixtures remain manually maintained. An external authoritative provider requires the architecture decision described in Architecture v1. If youth players appear publicly, the club must approve the specific fields, media usage, and required permissions before publishing them; omit unapproved records rather than blocking unrelated adult content.

## 8. Store requirements

| ID      | Requirement                            | Priority | Acceptance criteria                                                                                                                                                                                                                                                                                                                                                         |
| ------- | -------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHOP-01 | Browse official merchandise            | Must     | Shoppers can browse published kits and accessories with correct names, approved images, visible prices/currency, and availability; an empty category is understandable                                                                                                                                                                                                      |
| SHOP-02 | Inspect a product                      | Must     | Product detail explains the item, available variants, price, approved imagery and care information. Size-dependent products provide a usable size guide or measurements before adding to cart; unavailable choices cannot be purchased.                                                                                                                                     |
| SHOP-03 | Choose variants and quantity           | Must     | Required size/variant selection is explicit; the selected variant and quantity are reflected in the cart; invalid or unavailable choices explain the correction needed                                                                                                                                                                                                      |
| SHOP-04 | Use a cart                             | Must     | Shoppers can review selected items, update quantity, remove items, and proceed; totals update correctly; empty carts provide a return to shopping                                                                                                                                                                                                                           |
| SHOP-05 | Handle changed availability and prices | Must     | Before purchase, changed prices, archived items, or insufficient stock are explained; shoppers can revise the cart and review the updated total before paying                                                                                                                                                                                                               |
| SHOP-06 | Understand delivery eligibility        | Must     | Delivery is limited to Nagaland and clearly communicated before checkout; addresses outside Nagaland and unserviceable addresses within it are rejected before payment with a useful explanation; exact postcode coverage is verified against the approved delivery policy                                                                                                  |
| SHOP-07 | Review full cost                       | Must     | Prices and payment are in INR; before committing payment, the shopper sees item totals, shipping, applicable taxes/charges, and the final payable amount; no undisclosed fee appears afterward                                                                                                                                                                              |
| SHOP-08 | Pay and recover                        | Must     | Payment progress and pending/failure states are clear; recoverable failures preserve the cart and non-sensitive form data where appropriate; repeated submissions do not duplicate the purchase                                                                                                                                                                             |
| SHOP-09 | Obtain a reliable order record         | Must     | Verified payment/order outcome produces a stable order reference and item/total summary; a browser return alone never displays an unverified payment as confirmed                                                                                                                                                                                                           |
| SHOP-10 | Access order information securely      | Must     | Signed-in customers can see only their own authorized order information; a guessable order number alone grants no access; guest order lookup is outside release scope                                                                                                                                                                                                       |
| SHOP-11 | Understand fulfilment and support      | Must     | Order information separates payment from dispatch/delivery; available tracking/support information is usable; pending states identify the next step without false delivery promises                                                                                                                                                                                         |
| SHOP-12 | Read purchase policies                 | Must     | Shipping, cancellations/returns/refunds, privacy, and terms are accessible before purchase and use club-approved wording consistent with actual operations                                                                                                                                                                                                                  |
| SHOP-13 | Require an account before checkout     | Must     | At the checkout entry from the cart, offer registration and sign-in in context; advance to checkout only after authentication and any agreed verification gate. Customers need not register on a separate earlier visit. Return them to the purchase with permitted cart selections retained.                                                                               |
| SHOP-14 | Manage customer access                 | Must     | Support registration, sign-in, sign-out, and recovery for the selected method. On session expiry, protect order/account data, explain the need to sign in, and preserve non-sensitive cart selections where safe. Sign-out hides account/order/address data and does not leak them to the next user; post-sign-out cart behavior follows the approved shared-device policy. |

Category browsing is proposed for launch. Search, additional filters, and sorting should be justified by the real catalogue/reference layout rather than added automatically. Product cards and detail pages must remain useful without hover.

Anonymous browsing/cart preparation is proposed. Registration or sign-in is offered as the shopper enters checkout, so prior registration elsewhere is unnecessary; actual checkout and order access require authentication. Cart persistence/merging and shared-device behavior remain implementation/product decisions. Customer accounts must not be silently created, and marketing enrollment must not be bundled into purchase.

Proposed public stock wording is **In stock** or **Out of stock** for the selected variant. Do not expose exact counts or public low-stock urgency in v1 without an approved product reason. Changing variant must update its availability.

### Customer-account scope

| Capability                           | Priority | Status and boundary                                                                                                  |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------- |
| Registration and sign-in             | Must     | Account requirement agreed; contextual entry at checkout proposed; method open                                       |
| Sign-out and session-expiry recovery | Must     | Proposed detail; protect private data and avoid unnecessary loss of a recoverable cart                               |
| Account recovery                     | Must     | Proposed; recovery mechanism follows the selected sign-in method                                                     |
| Email verification before purchase | Must | Agreed 14 September 2026, D-15: verified email required before purchase. Method, screen placement, resend, and recovery details remain open. |
| Basic profile                        | Must     | Proposed minimum: account identity/contact information necessary for orders; optional biography/preferences excluded |
| Saved address book | Must | Selected for v1 on 14 September 2026, D-16: add, edit, select, and remove owned saved addresses; explicit saving and current delivery validation required. Changes do not alter historical order snapshots. |
| Own order history and detail         | Must     | Proposed minimum account feature; empty history has a clear shopping route                                           |
| Account deletion request             | Must     | Proposed support-assisted request and policy-based handling; self-service deletion UI not assumed                    |
| Marketing preferences                | Deferred | No marketing subscription collected in v1 by default; revisit only if marketing scope is approved                    |

Account contact changes, verification behavior, cart merge rules, and deletion processing need defined user flows. Historical order records follow the approved retention policy after account deletion rather than disappearing automatically.

### Customer-visible order vocabulary

This proposed vocabulary describes what users need to understand, not an implementation state machine. Display payment, fulfilment, and refund information separately so, for example, a paid/dispatched order can also have a pending refund.

| Area       | Label                         | Meaning to customer/staff                                                                                           |
| ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Payment    | Pending payment               | Payment is incomplete or awaiting confirmation; explain whether action or waiting is needed                         |
| Payment    | Payment failed                | The attempt failed; show a safe retry or support path                                                               |
| Payment    | Paid                          | Payment is confirmed; this does not mean dispatched                                                                 |
| Fulfilment | Processing                    | Staff are preparing the order                                                                                       |
| Fulfilment | Dispatched                    | Handover/dispatch is confirmed; show tracking when available                                                        |
| Fulfilment | Delivered                     | Delivery is confirmed by the agreed carrier/staff process                                                           |
| Order      | Cancelled                     | Cancellation is confirmed; refund status, if relevant, remains separately visible                                   |
| Refund     | Refund pending                | An accepted refund is being processed; no claim that funds have arrived                                             |
| Refund     | Partially refunded / Refunded | The confirmed refunded amount is shown; partial refunds are used only if the approved policy/provider supports them |
| Refund     | Refund needs attention        | A refund failed or needs staff action; no false completed status                                                    |

D-17 was agreed on 14 September 2026: customers submit a cancellation request from their order page for staff review. Show acknowledgement and pending review, prevent duplicate requests, and report the staff decision. A request does not automatically cancel or refund an order or grant permission to cancel after dispatch. Eligibility and time limits remain D-08 policy decisions.

## 9. Staff commerce and administration requirements

| ID     | Requirement                    | Priority | Acceptance criteria                                                                                                                                                                                                                                                                 |
| ------ | ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OPS-01 | Maintain the catalogue         | Must     | Authorized staff can create, edit, publish, and archive products/variants with approved prices, descriptions, and imagery; unpublished/incomplete products are not purchasable                                                                                                      |
| OPS-02 | Maintain inventory             | Must     | Authorized staff set opening stock, then record positive/negative adjustments with reasons and actor attribution under the proposed stock model. Show the resulting quantity, preserve committed/reserved stock, and prevent negative availability or overwriting concurrent sales. |
| OPS-03 | Find and inspect orders        | Must     | Staff can locate an order by reference and approved search fields, inspect item/variant quantities and necessary fulfilment details, and distinguish payment from fulfilment state                                                                                                  |
| OPS-04 | Fulfil purchases               | Must     | Permitted staff can record fulfilment progress and tracking where applicable; dispatch is not falsely implied by payment; repeated actions do not duplicate fulfilment                                                                                                              |
| OPS-05 | Handle cancellations/refunds   | Must     | Staff can follow the approved policy and initiate or record supported actions with audit attribution; pending/failed refunds are distinguishable from completed refunds; provider reconciliation remains authoritative                                                              |
| OPS-06 | Manage customer support        | Must     | The selected staffed support channel is available from relevant purchase/order screens; enquiries can reference an order; staff have approved handling and response expectations while accessing only necessary customer information.                                               |
| ADM-01 | Manage staff access            | Must     | An administrator can invite/disable staff and assign approved roles; disabling access prevents further protected operations; staff cannot elevate their own permissions                                                                                                             |
| ADM-02 | Enforce role boundaries        | Must     | Content editors, store managers, and administrators see and can perform only permitted operations; hidden UI is not the only access control                                                                                                                                         |
| ADM-03 | Audit sensitive actions        | Must     | Price changes, stock adjustments, refunds, overrides, and permission changes retain actor/action details; ordinary staff cannot rewrite the audit history                                                                                                                           |
| ADM-04 | Give usable operation feedback | Must     | Staff see save/progress/result/error states; failures do not claim success or discard recoverable input; expired or denied sessions provide a safe next step                                                                                                                        |

### Product publication and inventory operations

Proposed product states are **Draft**, **Published**, and **Archived**. Draft products are private and not purchasable; published products may appear in the store; archived products leave the purchasable catalogue while historical orders remain readable. **Out of stock is availability, not a publication state**: a published item may remain visible but cannot be added for an unavailable variant.

Proposed stock editing is **set opening stock**, then **adjust stock by +/− quantity with a reason**. Routine editing must not casually overwrite current stock. Corrections show the recorded and resulting quantities, require appropriate permission, and respect committed/reserved quantities. Physical-count reconciliation and opening-stock corrections need a controlled process rather than a generic overwrite field.

Low-stock visibility is a proposed **Should** feature for staff, with a configurable threshold. It is not a public urgency badge or an automatic notification campaign.

### Fulfilment, dashboard, and mobile administration

Proposed fulfilment default: staff pack/dispatch and enter tracking details when available. Automated courier booking and labels require a scope decision. Before purchase, show a club-approved dispatch estimate; show a delivery estimate only if the approved shipping service supports a defensible range. Tracking after dispatch supplements, rather than replaces, the pre-purchase expectation. Exact wording, working-day rules, and promises remain D-06 inputs.

Proposed admin home is role-specific navigation directly into content or orders, with an orders-needing-action list for store staff and access to drafts for editors. A custom KPI dashboard is deferred. Low stock and publication issues may appear in their relevant lists without creating a separate dashboard project.

Proposed mobile-admin minimum is staff sign-in, order lookup/detail, permitted fulfilment/tracking updates, and sign-out. Full rich-text authoring, complex catalogue editing, refunds, and staff permission administration are desktop-required initially; mobile availability of those additional tasks is optional and must not present broken controls as supported. Desktop covers the full approved workflow.

### Support, notifications, and purchase documents

A staffed support channel is a **Must**. Proposed default is a dedicated order-support email, linked from checkout policies, order detail, and transactional messages, with instructions to include the order reference. The club must confirm address, monitoring owner, and response expectations. Phone, WhatsApp, contact forms, and order-specific enquiry forms are not included automatically; D-10 selects the actual channels. Never request payment secrets through support.

| Notification event                         | Proposed priority       | Customer information                                                                                                  |
| ------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Order confirmed                            | Must                    | Order reference, purchased items/variants, paid total, delivery summary, support route                                |
| Payment failed or pending requiring action | Must                    | Accurate status and safe next action; persistent in-app feedback is required, outbound messaging only when actionable |
| Order dispatched                           | Must                    | Dispatch status, available tracking, approved delivery guidance                                                       |
| Refund completed                           | Must when refund occurs | Confirmed amount and order reference; distinguish completion from an expected banking settlement delay                |
| Cancellation confirmed                     | Should                  | Order/cancellation status and any separate refund information                                                         |

Proposed outbound channel is email; channel/provider approval remains D-10. Messages must match visible order status, avoid duplicate/conflicting updates, and not expose private information to an unverified recipient. Outbound-channel failure does not invalidate an existing order.

Every purchase needs an order confirmation, but confirmation is not automatically a tax invoice. D-07 must decide whether a downloadable invoice, emailed invoice, payment receipt, or tax document is required and who supplies it. Required fiscal documents are a launch dependency; formats, numbering, and amounts must follow the approved club/accountant policy.

## 10. Business decisions and proposed defaults

Answered decisions are marked Agreed. Other defaults remain proposals. Owners below are accountable roles to be assigned to named people; they are not claims that a particular staff member has already accepted responsibility. Needed-by milestones are dependencies, not invented calendar deadlines.

| ID   | Decision                                     | Direction or proposed default                                                          | Status / dependency                                                                                                                                                                    | Owner                              | Needed by                            |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| D-01 | Delivery market and currency                 | Nagaland-only delivery, priced and charged in INR                                      | Agreed; exact serviceable postcodes and delivery charges remain D-06 inputs                                                                                                            | Club operations                    | Before delivery-flow sign-off        |
| D-02 | Checkout identity                            | Account required before checkout; no guest checkout                                    | Agreed; registration/sign-in method, verification, recovery, and cart merging still need definition                                                                                    | Club product owner                 | Before account/checkout flows        |
| D-03 | Editorial approval                           | Content editors publish directly; administrators manage permissions                    | Agreed; no mandatory administrator approval step for publication                                                                                                                       | Club administrator                 | Before editorial flows               |
| D-04 | Initial catalogue                            | Club-supplied kits/accessories with explicit variants and stock                        | Open; product list, prices, SKU/variant information, images, and size guide required                                                                                                   | Club merchandise lead              | Before catalogue implementation      |
| D-05 | Payments                                     | One approved provider; supported methods chosen for the launch market                  | Open; provider, account readiness, settlement and payment methods not selected; COD proposed deferred                                                                                  | Club finance + product owner       | Before payment-flow sign-off         |
| D-06 | Delivery pricing and fulfilment              | Clearly disclosed delivery charge within Nagaland; staff fulfilment and tracking entry | Open; serviceable Nagaland postcodes, charges, carrier, dispatch commitments, pickup policy, and any thresholds required                                                               | Club operations                    | Before delivery flows and live sales |
| D-07 | Price/tax presentation                       | Clear final payable total before payment                                               | Open; club must supply applicable tax/invoice requirements and inclusive/exclusive display rules; no rates assumed                                                                     | Club finance/accountant            | Before totals/documents sign-off     |
| D-08 | Cancellation, returns, exchanges and refunds | Visible club-approved policy and staff-assisted handling                               | Open; eligibility, time limits, shipping responsibility, refund route, and failed-delivery treatment required                                                                          | Club operations + policy reviewer  | Before cancellation/refund flows     |
| D-09 | Stock model                                  | Available stock only; no preorders/backorders                                          | Proposed: opening stock then reasoned +/- adjustments, public in/out-of-stock wording, optional staff low-stock view; reservation/quantity/restocking details open                     | Club store manager                 | Before inventory/cart implementation |
| D-10 | Communication/support                        | Order confirmation plus dispatch communication; visible support contact                | Proposed: support email and transactional email for listed events; actual contact/channel, sender/provider, monitoring owner and response expectations open                            | Club support/operations            | Before support/notification flows    |
| D-11 | Player/team and fixture presentation         | Structured manual editing and approved public fields                                   | Proposed: English, labelled IST, launch-season fixtures/results and minimal team references; optional team/profile pages; covered teams and content/photo permissions require approval | Club editorial lead                | Before content-flow sign-off         |
| D-12 | Homepage and CMS editing coverage            | Structured fields and approved sections, preserving the design                         | Proposed; editable section inventory and freshness/withdrawal targets required                                                                                                         | Club editorial lead                | Before CMS editing implementation    |
| D-13 | Account controls and privacy                 | Separate customer/staff identities and protected account lifecycle                     | Open; sign-in/recovery, session/shared-device behavior, exact staff permissions, staff MFA, retention/deletion, and consent; verification and address book tracked in D-15/D-16        | Club administrator + privacy owner | Before account/admin flows           |
| D-14 | Release constraints                          | Validate a full content-and-purchase journey before live sales                         | Open; launch date, budget, staff owners, supported devices/browsers, and operational targets required                                                                                  | Club product owner + operations    | Before release planning              |
| D-15 | Email verification gate | Require verified email before purchase | Agreed 14 September 2026 by explicit user answer; verification/resend/recovery method and screen placement remain to be defined | Club product owner | Before purchase implementation |
| D-16 | Saved delivery addresses | Include saved-address management in v1 | Agreed 14 September 2026 by explicit user answer; owned add/edit/select/remove, explicit saving, current serviceability checks, and immutable historical order addresses | Club product owner | Before account/address implementation |
| D-17 | Cancellation initiation | Customer submits an order-page request for staff review | Agreed 14 September 2026 by explicit user answer; acknowledgement/pending review and duplicate protection required. Eligibility and refund policy remain D-08 inputs. | Club operations | Before order-support implementation |

Legal/tax/privacy policy content must come from the club and appropriate review; this draft does not supply jurisdiction-specific legal advice or assume compliance. These are actual launch inputs, not placeholder promises for the public website.

## 11. User experience and quality requirements

| ID    | Requirement                   | Priority | Acceptance criteria                                                                                                                                                                                                                                               |
| ----- | ----------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-01 | Responsive use                | Must     | Public purchase journeys work on narrow screens and desktop. Proposed mobile-admin coverage includes sign-in, order lookup/detail, fulfilment/tracking updates, and sign-out; full desktop admin remains usable. Unsupported mobile tasks are clearly identified. |
| UX-02 | Keyboard and assistive access | Must     | Navigation, variant selectors, cart, checkout, and staff forms support keyboard use; labels, errors, focus states, and dialog focus behavior are understandable; status is not conveyed by color alone                                                            |
| UX-03 | Readable and stable content   | Must     | Existing typography remains readable at zoom and with long names/titles; media dimensions/fallbacks avoid broken layouts; reduced-motion preferences are respected                                                                                                |
| UX-04 | Honest transaction feedback   | Must     | No fake stock urgency, hidden charges, preselected marketing consent, or claims of successful payment/refund before confirmation                                                                                                                                  |
| UX-05 | Recoverable forms             | Must     | Required inputs are identified; field errors explain corrections; pending work is visible; recoverable errors preserve permitted input without retaining payment secrets                                                                                          |
| UX-06 | Useful failure states         | Must     | Missing content, unavailable products, rejected destinations, payment uncertainty, and permission denial each provide a relevant next step                                                                                                                        |
| Q-01  | Publication correctness       | Must     | Draft/private content stays private, published content meets the approved freshness target, and withdrawn content follows the agreed removal rules                                                                                                                |
| Q-02  | Commerce correctness          | Must     | Test purchases, concurrency, retries, and delayed/duplicate payment events do not oversell stock, duplicate orders, or misstate payment status                                                                                                                    |
| Q-03  | Data privacy                  | Must     | Customers see only their records, staff access matches roles, and raw card data is outside NUSC storage; order retention and account deletion follow the approved policy                                                                                          |
| Q-04  | Discoverability               | Must     | Public web/store routes have appropriate titles, metadata, canonical URLs and sitemaps; private account/admin content is not presented as public searchable content                                                                                               |
| Q-05  | Operational readiness         | Must     | Staff can identify and recover failed transactions/publications; notification failure does not erase an order; restore/readiness evidence meets architecture gates                                                                                                |

Public pages should feel fast on typical mobile connections; product imagery must not make basic browsing unreasonably slow. Checkout actions show feedback without ambiguous waiting, and admin actions promptly show progress/result. Do not display a successful outcome merely to mask a delay. Numeric budgets and the test connection/device profile remain implementation/operations inputs before launch.

Acceptance requires manual review of critical interactions as well as automated checks. Specific accessibility conformance target, browser/device matrix, load/performance budgets, availability expectations, and recovery targets must be selected before launch. This PRD baseline makes no claim that these requirements have been implemented or validated.

## 12. Success measures

| Outcome                             | Measure to establish                                                                            | Release evidence                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Staff can maintain content          | Successful update/publish tasks without developer intervention; task completion time and errors | Representative staff complete news, player, and fixture updates in a rehearsal    |
| Supporters find current information | Completion of news/player/fixture lookup tasks                                                  | Reviewers locate the correct published information on mobile and desktop          |
| Shoppers can buy confidently        | Checkout completion and failure reasons; duplicate/oversell incidents                           | Test orders cover success, failure, pending confirmation, and changed stock/price |
| Store staff can operate orders      | Time to locate/prepare an order; unprocessed/pending exceptions                                 | Staff rehearse fulfilment and the approved refund/cancellation path               |
| Existing website is preserved       | Route/content/interaction regressions and visual issues                                         | Existing pages pass agreed regression checks and club review                      |

Numeric business targets, baseline collection, analytics tooling, and consent requirements are open. Collect only the operational/product measurements needed for approved decisions; do not add tracking automatically. The launch gate is demonstrated task completion and correctness, not an invented conversion-rate target.

## Policy dependencies that block launch

| Policy/input                              | Required outcome                                                                                       | Accountable role                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Shipping                                  | Nagaland serviceability, charges, dispatch/delivery wording, tracking and failed-delivery process      | Club operations                                              |
| Cancellation, returns, exchanges, refunds | Eligibility, initiation channel, time limits, item/stock handling, charges and refund responsibilities | Club operations + policy reviewer                            |
| Privacy and retention                     | Approved collection/use, account deletion, record retention, consent and staff access                  | Club privacy owner                                           |
| Terms of purchase                         | Accurate transaction terms consistent with the approved store behavior                                 | Club product owner + policy reviewer                         |
| Tax/invoice/receipt                       | Approved price/tax presentation and required customer documents                                        | Club finance/accountant                                      |
| Support process                           | Staffed channels, contact details, operating responsibility and response expectations                  | Club support/operations                                      |
| Youth-player publication, if applicable   | Approved fields/photos and required consent/permissions before affected records are public             | Club editorial lead + responsible safeguarding/privacy owner |

These policies must be approved and reflected in the actual experience before live sales or affected content publication. Placeholder legal text, invented shipping estimates, and unconfirmed support availability are not acceptable launch substitutes.

## 13. Required inputs and dependencies

- Club-approved news, player/team details, fixtures/results, sponsor/partner information, and current career openings.
- The supplied shop reference ZIP/folder and any assets it needs; inspect licensing/usage permissions and actual dependency needs before adopting further pieces.
- Real product catalogue, variant/size information, price/currency, inventory, official photos, descriptions, and usable measurements/size guidance before any size-dependent product can go live.
- Approved delivery, payment, cancellation/return/refund, tax/invoice, privacy, and customer-support policies.
- Identified staff for editorial, store, access administration, and operational support; role and publishing decisions.
- Provider accounts/configuration and architecture compatibility evidence when implementation is authorized; credentials must be supplied through appropriate secret handling, not product documents.

The current club contact details can be retained for existing enquiries, but their suitability as a staffed order-support channel must be confirmed. Existing club placeholders do not authorize placeholder store products for live sales.

## 14. User-flow coverage to write next

Detailed steps, screens, branches, and recovery states belong in USER-FLOWS.md after the relevant product decisions are settled.

| Planned flow                                                                           | Related requirements       | Dependency                                                            |
| -------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| Discover club/news/player/fixture content                                              | WEB-01 to WEB-06           | Public content/page decisions                                         |
| Browse merchandise, select a variant, and manage cart                                  | SHOP-01 to SHOP-05         | Catalogue and reference layout                                        |
| Register/sign in, recover access, and return to the cart                               | SHOP-13, SHOP-14           | Sign-in method, D-15 verification, account recovery, and cart merging |
| Enter Nagaland delivery details, review INR charges, pay, and recover from uncertainty | SHOP-06 to SHOP-09         | D-01/D-02 agreed; D-05 to D-09 operational details open               |
| Retrieve order status and request support                                              | SHOP-10 to SHOP-12, OPS-06 | D-02, D-08, D-10, D-17                                                |
| Draft, preview, directly publish, and unpublish club content                           | CMS-01 to CMS-06           | D-03 agreed; final unpublish permissions, D-11, D-12 open             |
| Maintain a product and adjust inventory                                                | OPS-01, OPS-02, ADM-03     | D-04, D-09 and role permissions                                       |
| Process fulfilment, cancellation, and refund                                           | OPS-03 to OPS-05           | D-05 to D-08, D-10                                                    |
| Invite, change permissions, and disable staff access                                   | ADM-01 to ADM-04           | D-13                                                                  |

This inventory is not a substitute for the user-flow document. Detailed authentication, checkout, and editorial recovery steps remain to be written within the agreed account-required checkout and direct-publishing policies.

## 15. Release acceptance and approval

Before live commerce or public CMS cutover:

1. The club approves this PRD's release scope, proposed exclusions, and relevant business decisions.
2. Required product/content assets and policies are complete and consistent with actual staff operations.
3. User flows and requirement acceptance criteria are reviewed with representative customer/staff scenarios.
4. Architecture v1 verification gates pass with recorded evidence; implementation is separately authorized and completed.
5. Existing website behavior/design is preserved, CMS publication works, and end-to-end test purchases and staff order handling succeed.
6. Access boundaries, pending/failed payment recovery, stock correctness, notifications, support, and restore readiness are verified.
7. No critical issue remains that could mischarge a customer, expose private data, duplicate a purchase, or prevent the agreed core journey.
8. Production deployment and payment activation receive explicit authorization after the reviewable result is ready.

No launch item above is marked complete. PRD v1 freezes agreed product scope, not open policy answers, proposed defaults, or production readiness. Architecture and PRD approval do not authorize the build. Material product-scope changes must update this PRD and linked flows; changes to frozen architectural boundaries require the ADR process.
