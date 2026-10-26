## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

An administrator can create and edit products: SKU, name, category, unit, selling price, active status, and a reorder threshold per store. SKUs are unique across the organization and cannot change once a transaction exists. A deactivated product stays searchable in historical records but cannot be added to new documents.

**Covers:** MD-01, MD-02.
**Demo:** Create SKU001-003 with Section 8.1 prices; reject a duplicate SKU; reject a negative price or threshold; deactivate a product and still find it in history.
**Seams:** contract schema tests; controller `call()`.

## Acceptance criteria

- [ ] An administrator creates/edits a product with SKU, name, category, unit, selling price, active status, and per-store reorder threshold, observable at the controller seam.
- [ ] SKU is unique organization-wide; a duplicate SKU is rejected at the controller seam.
- [ ] Negative selling price or reorder threshold is rejected at the contract schema seam; quantities are whole numbers.
- [ ] A deactivated product remains searchable in historical records but cannot be added to a new document, observable at the controller seam.
