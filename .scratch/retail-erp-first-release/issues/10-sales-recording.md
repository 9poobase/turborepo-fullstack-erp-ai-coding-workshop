## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A store employee can record a sale for their store using active products and positive whole-number quantities at the current selling price, which is retained in the document; prices cannot be overridden. A draft sale does not reduce stock. On confirmation the latest stock for every line is validated; if any line is short the entire document is rejected and the affected products are named (no partial posting). A successful confirmation generates a document number and decreases stock with movement history in one transaction. Duplicate confirmation never creates another sale or deducts stock again. Confirmed sales are view-only.

**Covers:** SAL-01, SAL-02, SAL-03, SAL-04.
**Demo:** AC-06 sell 2 of SKU001 + 1 of SKU002 → total 155.00, balances 8 and 4, resend → no further change; AC-05 sell 11 of SKU001 vs stock 10 → rejected, no sale or deduction.
**Seams:** controller `call()` against real Postgres.

## Acceptance criteria

- [ ] **AC-06 (SAL-01..SAL-03):** selling 2 of SKU001 and 1 of SKU002 totals 155.00, balances become 8 and 4, and resending the same request causes no further change.
- [ ] **AC-05 (SAL-02):** selling 11 of SKU001 when stock is 10 fails with no confirmed sale or deduction and names the short product.
- [ ] Current selling price is retained and cannot be overridden; only active products sell; quantities are positive whole numbers.
- [ ] Confirmation generates a document number and decreases stock with movement in one atomic transaction; confirmed sales are view-only.
