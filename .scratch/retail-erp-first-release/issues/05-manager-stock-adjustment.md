## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A manager can increase or decrease stock with a mandatory reason, and the change is recorded as an immutable movement capturing product, store, quantity change, balance before and after, movement type, source, actor, and timestamp. Reductions larger than the available balance are rejected; balances never go negative; the posting and its movement commit or roll back together.

This is the first ticket that writes stock, so it stands up the Postgres integration test harness (reset-per-scenario with Section 8.1 fixtures), the idempotency-key mechanism, and server-side document numbering. Every later stock-writing ticket depends on this one.

**Covers:** INV-02, INV-03, INV-05, NFR-03 (audit); introduces the Postgres test harness, idempotency keys, document numbering.
**Demo:** Adjust B01 SKU001 by +5 with a reason; the movement row shows before/after and actor; an over-reduction is rejected.
**Seams:** controller `call()` against a real Postgres test database.

## Acceptance criteria

- [ ] A Postgres integration test harness exists that resets to the Section 8.1 starting data before each scenario.
- [ ] A manager adjusts stock up or down with a mandatory reason; the movement records product, store, change, balance before/after, type, source, actor, and timestamp, observable at the controller seam against real Postgres.
- [ ] A reduction greater than the available balance is rejected and the balance never goes negative.
- [ ] The posting and its movement are atomic: a forced failure rolls back both, leaving the balance unchanged.
- [ ] Confirmed movements cannot be edited or deleted.
