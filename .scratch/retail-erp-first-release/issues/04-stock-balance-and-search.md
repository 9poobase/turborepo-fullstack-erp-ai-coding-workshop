## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A store employee can search stock by SKU, product name, and store and see the current quantity, unit, reorder threshold, and a low-stock flag when quantity is at or below the threshold. This ticket establishes per-store stock balances and the append-only movement ledger shape that every stock-writing ticket reuses.

**Covers:** INV-01; introduces the append-only movement/audit ledger shape.
**Demo:** With seeded balances, search B01; SKU003 (balance 0, threshold 3) shows as low-stock.
**Seams:** contract schema tests; controller `call()`.

## Acceptance criteria

- [ ] Stock search by SKU, product name, and store returns current quantity, unit, and reorder threshold, observable at the controller seam.
- [ ] A product with quantity at or below its threshold is flagged low-stock at the controller seam.
- [ ] A per-(product, store) stock balance exists and is uniquely constrained; the append-only movement ledger model is in place (no edit/delete path), observable at the schema/controller seam.
- [ ] Results paginate newest-first with loading/empty/error states (reusing the shared conventions) at the web component seam.
