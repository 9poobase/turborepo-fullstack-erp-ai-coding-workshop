## Problem Statement

RetailOne operates a head office and two stores (B01 Central, B02 Riverside). Product records, purchase orders, and stock balances live in separate files. Stock checks are slow, goods get received twice, and nobody can trace how a balance changed. Staff cannot trust the number on screen, managers cannot see across stores, and there is no audit trail for approvals, receipts, sales, or adjustments.

They need one web application that connects purchasing, receiving, sales, and reporting, with inventory movements that are traceable, non-negative, and never double-posted — in Thai, in Thai baht, with Asia/Bangkok dates, scoped per store.

## Solution

Deliver the complete functional baseline of the Retail ERP as a single release on this Turborepo monorepo (React web + NestJS API + oRPC/Zod contract + Prisma/Postgres):

- **Master data**: products (unique SKU, per-store reorder threshold), stores, suppliers, with historical snapshots preserved.
- **Inventory**: per-store stock balances, an append-only movement ledger recording before/after balances, and manager stock adjustments.
- **Purchasing**: draft → approval → receiving lifecycle for purchase orders with a strict status machine.
- **Goods receipt**: partial, idempotent, concurrency-safe receiving that increases stock atomically.
- **Sales**: idempotent, concurrency-safe sales that decrease stock atomically, rejecting the whole document if any line is short.
- **Reporting**: daily sales, stock-on-hand, low-stock, and movement-history reports, with CSV export safe for Thai text and spreadsheet formula injection.
- **Cross-cutting**: API-enforced role + store authorization, audit trail, Thai UI with standard loading/empty/error states.

Correctness guarantees (no negative stock, no double posting, no permission bypass, no lost concurrent updates) are proven by the eight TOR acceptance scenarios (AC-01..AC-08) implemented as integration tests, plus a requirement-ID → test traceability map.

## User Stories

1. As an administrator, I want to create and edit products with SKU, name, category, unit, selling price, active status, and a per-store reorder threshold, so that the catalogue reflects what each store stocks.
2. As an administrator, I want SKUs to be unique across the organization and immovable once a transaction exists, so that historical documents always resolve to the same product.
3. As an administrator, I want selling prices and reorder thresholds to be rejected when negative, so that invalid master data never enters the system.
4. As an administrator, I want to deactivate a product while keeping it searchable in historical records, so that discontinued goods stay auditable but cannot be added to new documents.
5. As an administrator, I want to maintain store codes/names and supplier codes/names/contacts, so that purchase orders can reference a real supplier and destination store.
6. As an administrator, I want to manage users and their store assignment and role, so that each person can act only where they are authorized.
7. As a store employee, I want to search stock by SKU, product name, and store, so that I can quickly see current quantity, unit, reorder threshold, and low-stock status.
8. As a store employee, I want low-stock to be flagged when quantity is at or below the threshold, so that I know what to reorder.
9. As any actor causing a stock change, I want every increase or decrease to record product, store, quantity change, before/after balance, movement type, source document, actor, and timestamp, so that every movement is fully traceable.
10. As an auditor, I want confirmed movements to be immutable (no edit, no delete), so that the ledger is trustworthy.
11. As the business, I want stock balances to equal opening balance plus successful movements and never go negative, so that the system reflects physical reality.
12. As the business, I want document posting and the stock update to commit or roll back together, so that a half-applied transaction can never exist.
13. As the business, I want concurrent transactions on the same product and store to never lose an update and to validate the authoritative balance (not the browser's), so that two users cannot oversell or over-receive.
14. As a manager, I want to increase or decrease stock with a mandatory reason recorded in the movement history, so that adjustments are accountable.
15. As a manager, I want stock reductions larger than the available balance to be rejected, so that adjustments cannot drive stock negative.
16. As a purchasing officer, I want to create draft purchase orders with a supplier, destination store, expected receipt date, and at least one product line, so that I can prepare an order.
17. As a purchasing officer, I want ordered quantities validated as positive whole numbers, unit prices as non-negative, and duplicate SKUs in one order rejected, so that orders are well-formed.
18. As a purchasing officer, I want to edit a draft and submit it for approval, so that a manager can review a complete order.
19. As a purchasing officer, I want creating or approving an order to not change stock, so that stock only moves on actual receipt.
20. As a manager, I want to approve or reject a submitted order with a reason, so that spending is controlled.
21. As the business, I want approved lines, quantities, prices, and destination store to be immutable, so that an approved commitment cannot be silently altered.
22. As a purchasing officer, I want a rejected order to remain viewable, with resubmission requiring a new order, so that history is preserved.
23. As a creator or manager, I want to cancel only Draft or Pending Approval orders with a reason, so that in-flight commitments are not cancelled out from under receiving.
24. As a store employee, I want to receive only Approved or Partially Received orders for my assigned store, so that I cannot receive against another store's order.
25. As a store employee, I want the receiving screen to show ordered, previously received, and outstanding quantities per line, so that I know what remains.
26. As a store employee, I want partial receipts across multiple deliveries, with each received quantity a non-negative whole number and at least one line greater than zero, so that real-world staggered deliveries work.
27. As the business, I want cumulative receipts to never exceed ordered quantities and products outside the order to be rejected, so that receiving stays within the approved commitment.
28. As a store employee, I want confirmation to create a goods-receipt number, increase destination-store stock, and record movements, setting the order to Partially Received or Completed, so that stock and order status stay consistent.
29. As a store employee, I want repeated confirmation clicks, duplicate requests, and retries after a network failure to never increase stock twice and to return the original receipt, so that flaky networks cannot corrupt stock.
30. As a store employee, I want a deliberately new receipt to still be possible after an earlier one, so that genuine subsequent deliveries are not blocked by idempotency.
31. As the business, I want concurrent receiving requests to never exceed the order quantity in total, so that races cannot over-receive.
32. As a store employee, I want a sale created for my assigned store using active products and positive whole-number quantities at the current selling price, with no price override, so that sales are priced correctly and cannot be tampered with.
33. As the business, I want a draft sale to not reduce stock and confirmation to validate the latest stock for every line, rejecting the entire document and naming the short products if any line is insufficient, so that partial posting never happens.
34. As a store employee, I want a successful sale to generate a document number, record the sale, and decrease stock with movement history in one transaction, so that the sale and its stock effect are atomic.
35. As a store employee, I want duplicate sale confirmation to not create another sale or deduct stock again, so that double-clicks are safe.
36. As a store employee, I want a confirmed sale to be viewable but not editable, cancellable, or returnable, so that the record is final for this release.
37. As a manager, I want a daily sales report filtered by date range and store, counting only confirmed sales and showing document count, units sold, and total amount, so that I can see trading performance.
38. As a manager, I want stock-on-hand and low-stock reports by store with product search, keeping zero-stock products visible when they match, so that I can plan replenishment.
39. As a manager, I want movement history filtered by product, store, movement type, and date range with access to the source document, so that I can investigate any balance.
40. As a store employee, I want movement history and reports scoped to my assigned store while managers see all stores, so that data stays within my authorization.
41. As a manager, I want to export sales and stock reports as CSV supporting Thai text, with the same filters and permissions as the screen, and values that spreadsheets might read as formulas handled safely, so that exports are correct and safe.
42. As the business, I want a reporting day defined as 00:00:00 inclusive to the next midnight exclusive in Asia/Bangkok using the sale confirmation timestamp, so that daily totals are unambiguous.
43. As a user, I want lists to paginate and order newest-first, and every screen to show loading, success, and error states, so that the UI is predictable.
44. As a user, I want Thai error messages that tell me whether to correct my input or retry, without stack traces or database details, so that I can recover from errors.
45. As the business, I want authentication required before any data access and both role and store permissions enforced at the API for every request, so that hiding buttons is never the only control.
46. As a security owner, I want passwords never stored or logged in readable form and secrets kept out of source, with non-production test data, so that credentials are protected.
47. As an auditor, I want approvals, goods receipts, sales, and stock adjustments audited with actor, timestamp, source document, and outcome, with access restricted by permission, so that sensitive actions are accountable.
48. As a user, I want input validated in both the interface and the API, so that bad data is caught early and consistently.
49. As the business, I want search and stock-view APIs to hold a p95 of 2 seconds or less with 1,000 products, 10,000 movements, and 10 concurrent users over 5 minutes, so that the system is usable at scale.
50. As a user, I want core screens to work on a 1366px desktop viewport with labelled inputs and keyboard operation, so that the app is accessible.

## Implementation Decisions

**Scope**
- Deliver the full functional baseline (MD, INV, PO, GR, SAL, RPT + NFR-01..06) as a single release. If timeline forces phasing, the cut is MD+INV+PO+GR first, then SAL+RPT.
- Out of baseline: all Section 3 exclusions, and CR-01 (damaged goods). The movement ledger and goods-receipt-line models are the designated extension points if CR-01 is later approved.

**Clarifications locked (require RetailOne written sign-off before acceptance)**
- Q-01 single-manager approval, Q-03 no backdated receiving (use system confirmation timestamp), Q-04 no reversals, Q-05 one base unit per SKU / no barcode — all at TOR defaults.
- Q-02: a product deactivated *after* its PO was approved may still be received against that order. Rationale: the approved PO is a prior commitment, and the "inactive products cannot be added to new documents" rule (MD-02) governs *new* documents only, not fulfillment of an existing approved order.

**Roles & authorization**
- Expand the role vocabulary from the starter's `ADMIN`/`STAFF` to the four TOR roles: Administrator, Purchasing officer, Store employee, Manager. This is a schema (Prisma enum) and contract (Zod `RoleSchema`) change propagated through the existing `@Roles()` decorator and `AuthGuard`.
- Add store membership to the user model so a store employee is bound to one store.
- Enforce authorization at the API on every request (NFR-01): role via the existing `@Roles()`/`AuthGuard` seam; **store-scope at the resource/service level**, because a receipt's or sale's store is derived from the referenced document, not always a direct request parameter. Managers and administrators see/act across all stores. Authorization failures return 403 and change no business data (AC-04).

**Data model (Prisma)**
- Entities: `Store`, `Supplier`, `Product`, `ProductStoreThreshold` (per-store reorder threshold), `PurchaseOrder` + `PurchaseOrderLine`, `GoodsReceipt` + `GoodsReceiptLine`, `Sale` + `SaleLine`, `StockBalance` (current quantity per product×store), `StockMovement` (append-only ledger), and the existing `User` extended with store membership + expanded role.
- `StockMovement` is append-only (no update/delete) and records product, store, quantity change, balance before/after, movement type, source-document reference, actor, and timestamp. It is both the movement record (INV-02) and the audit trail for stock-affecting actions (NFR-03).
- Audit for the non-stock-moving PO approval is stored as fields on the order (approver, approved-at, reason), not a synthetic movement.
- `StockBalance` holds the current authoritative quantity alongside the ledger, so confirmation can lock a single row and re-read it.
- Unique constraints enforced at the database: SKU unique across the organization; document numbers unique per document type; idempotency key unique; `(product, store)` unique in `StockBalance`; store codes and supplier codes unique; no duplicate SKU within one PO.
- Money stored as Prisma `Decimal` (never float); quantities as integers. Line amount = quantity × unit price; document total = sum of line amounts. No discounts or taxes.

**Transactions, idempotency, concurrency**
- Posting (receipt confirmation, sale confirmation, stock adjustment) and the corresponding movement + balance update commit or roll back together in one transaction (INV-03).
- Concurrency (INV-04, GR-05, AC-07): inside the transaction, lock the stock row (`SELECT ... FOR UPDATE`) and re-validate the authoritative balance; reject any request that would go negative or exceed the order. Never trust the browser-displayed balance.
- Idempotency (GR-04, SAL-03): the web app generates an idempotency key per confirmation action; it is stored with a unique constraint; replaying the same key returns the original document without re-posting; a deliberately new receipt uses a fresh key.

**PO status machine**
- Statuses: Draft, Pending Approval, Approved, Partially Received, Completed, Rejected, Cancelled.
- Allowed transitions are encoded as a single table enforced at the service layer; transitions outside the table are rejected. Creating/approving never moves stock (PO-02). After approval, lines/quantities/prices/destination store are immutable (PO-03). Cancel only from Draft or Pending Approval, by creator or manager, with a reason (PO-04). Partially Received / Completed are computed from cumulative received quantity vs. ordered quantity (GR-03), never set manually.

**Contract & validation**
- Contract-first: all input/output schemas are Zod in `packages/contracts`, the single source of truth, used by both web and API (NFR-04). Field-level rules (positive-integer quantities, non-negative prices, SKU format, no duplicate SKU in a line) live here.
- Business-rule validation (insufficient stock, over-receipt, illegal transition) runs at the API service against the database.
- API errors use a standard shape — `{ code, messageTh, kind: 'input' | 'retry' }` — carrying a Thai message and whether the user should correct input or retry; stack traces and database details are never exposed.

**Web conventions (recorded in apps/web/AGENTS.md)**
- Thai UI throughout; store timestamps in UTC, display in Asia/Bangkok via a single utility; money always to two decimals.
- A reporting day is 00:00:00 inclusive to the next midnight exclusive in Asia/Bangkok, keyed on the sale confirmation timestamp.
- Lists paginate and order newest-first by default; shared loading/empty/error components; keyboard-operable, labelled inputs; 1366px desktop viewport.

**Reporting / CSV**
- CSV export writes UTF-8 with BOM (correct Thai in Excel) and escapes any cell beginning with `=`, `+`, `-`, `@`, tab, or carriage return to prevent formula injection (RPT-04), using a CSV library that quotes fields correctly. Export applies the same filters and permissions as the screen.

## Testing Decisions

**What makes a good test**: assert external, observable behavior through the contract — the typed output of a handler call and the resulting database state — never internal implementation details. A test should map to a requirement ID or acceptance criterion and survive refactors that preserve behavior.

**Primary seam — oRPC contract handler via `call()` at the controller level.** Reuse the existing pattern in `health.controller.spec.ts` (`call(controller.handler(), input)`). Each AC-01..AC-08 scenario and each requirement is exercised by calling a controller handler with typed input and asserting typed output plus DB state. This single, highest seam covers validation → authorization → business rules → transaction → movement in one place.

- The transactional/concurrency/idempotency tests (AC-02, AC-06, AC-07) and the unique-constraint and permission tests (AC-04) run against a **real Postgres test database**, because `SELECT ... FOR UPDATE` locks, unique constraints, and transactional roll-back are database behaviors that mocks cannot prove. This is a deliberate departure from the starter's `health` spec, which mocks `PrismaService`.
- Fixtures reproduce Section 8.1 exactly (stores B01/B02, supplier SUP01, SKU001-003 with balances and prices, PO-DEMO-001 approved for 20×SKU001 @ 45.00, users buyer01/staff_b01/staff_b02/manager01). The database is reset before each scenario; no scenario depends on another's outcome.

**Secondary seam — contract schema tests** (`*.test.ts` in `packages/contracts`, as in `auth.test.ts`): prove field-level Zod validation (positive-integer quantities, non-negative prices, duplicate-SKU rejection) at the contract boundary.

**Web seam — component tests** (per the `write-tests` skill): prove the shared UI conventions — loading/empty/error states, Thai money/date formatting, and the CSV formula-escaping helper.

**Separate, non-gating seam — load test** (e.g. k6 or autocannon) for NFR-05: seed 1,000 products / 10,000 movements, drive 10 concurrent users for 5 minutes against the search and stock-view APIs, and report p95 ≤ 2s. Run at the UAT-readiness milestone, not on every PR.

**Traceability**: every requirement ID maps to at least one automated test; the spec carries an ID → test-name → evidence table. The eight AC scenarios are the acceptance gate and are written first.

## Out of Scope

- All Section 3 exclusions: general ledger, AP/AR, payroll, manufacturing, tax calculation and tax invoices, real payments, external POS/ERP integration, inter-store transfers, batch/expiry tracking, returns, and migration of real business data.
- CR-01 damaged-goods-on-receipt (remains in the change register; the movement ledger and goods-receipt-line models are the extension points).
- Register futures Q-01, Q-03, Q-04, Q-05 (multi-approver/thresholds/delegation, backdated receiving, reversals, multiple units/barcode).
- Discounts, taxes, inventory valuation, and cost of goods sold.
- Cancellation of Approved or partially received orders; receipt reversals; sale edit/cancel/return.
- Customer personal data and real payment processing.

## Further Notes

- This spec requires schema and contract changes to the starter: the role vocabulary expands from `ADMIN`/`STAFF` to the four TOR roles, and users gain store membership. These ripple through `RoleSchema` (contract), the Prisma `Role` enum, and the `AuthGuard`/`@Roles()` path.
- Three items need RetailOne written sign-off before the affected requirements are used for acceptance: the Q-02 decision (receiving a later-deactivated product against an approved PO), confirmation that Q-01/Q-03/Q-04/Q-05 stay at defaults, and confirmation that CR-01 stays out of baseline. The TOR's clarification register (Section 10) is the place to record these.
- Acceptance is gated on AC-01..AC-08 passing and on no defect causing incorrect stock, duplicate posting, permission bypass, or data loss.
