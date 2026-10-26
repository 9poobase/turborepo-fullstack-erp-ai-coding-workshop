## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A manager can view stock-on-hand and low-stock reports by store with product search. Zero-stock products stay visible when they match the filters, and a product at or below its reorder threshold appears in the low-stock report.

**Covers:** RPT-02.
**Demo:** AC-08 (low-stock half) — SKU003 with a B01 balance of 0 appears in the B01 low-stock report because 0 is at or below the threshold of 3.
**Seams:** controller `call()`; web component.

## Acceptance criteria

- [ ] **AC-08 (RPT-02, low-stock half):** SKU003 (B01 balance 0, threshold 3) appears in the B01 low-stock report.
- [ ] Stock-on-hand and low-stock reports filter by store with product search, observable at the controller seam.
- [ ] Zero-stock products remain visible when they match the filters.
- [ ] Reports paginate newest-first with loading/empty/error states at the web component seam.
