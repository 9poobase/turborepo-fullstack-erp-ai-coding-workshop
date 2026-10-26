## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A user can view movement history filtered by product, store, movement type, and date range, with access to the source document behind each movement. A store employee sees only their assigned store; a manager sees all stores.

**Covers:** RPT-03, NFR-01.
**Demo:** Filter B01 SKU001 movements and open a source receipt; staff_b02 cannot see B01 movements.
**Seams:** controller `call()` against real Postgres.

## Acceptance criteria

- [ ] Movement history filters by product, store, movement type, and date range and links to the source document, observable at the controller seam.
- [ ] A store employee sees only their assigned store's movements; a manager sees all stores, enforced at the API.
- [ ] Results paginate newest-first with loading/empty/error states at the web component seam.
