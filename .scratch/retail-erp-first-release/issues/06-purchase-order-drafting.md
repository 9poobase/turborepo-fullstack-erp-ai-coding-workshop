## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A purchasing officer can create and edit a draft purchase order with a supplier, destination store, expected receipt date, and at least one product line. Ordered quantities must be positive whole numbers, purchase unit prices cannot be negative, and the same SKU cannot appear twice in one order.

**Covers:** PO-01, PO-03 (draft editing).
**Demo:** Draft a PO for SUP01 → B01 with 20 packs of SKU001 at 45.00; a line repeating SKU001 is rejected.
**Seams:** contract schema tests; controller `call()`.

## Acceptance criteria

- [ ] A purchasing officer creates a draft PO with supplier, destination store, expected receipt date, and at least one line, observable at the controller seam.
- [ ] Ordered quantity must be a positive whole number and unit price non-negative, rejected at the contract schema seam otherwise.
- [ ] A duplicate SKU within one order is rejected at the controller seam.
- [ ] A draft can be edited while it remains a draft, observable at the controller seam.
