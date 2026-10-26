## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A store employee can receive goods against an Approved or Partially Received order for their store. The receiving screen shows ordered, previously received, and outstanding quantities per line. Partial receipts across multiple deliveries are supported; cumulative receipts can never exceed the ordered quantity and products outside the order are rejected. Confirming creates a goods-receipt number, increases destination-store stock, and records movements atomically, moving the order to Partially Received or Completed. Repeated clicks, duplicate requests, and retries never increase stock twice and return the original receipt, while a deliberately new receipt is still possible. Concurrent receiving never exceeds the order total. A product deactivated after the order was approved can still be received against that order (decision Q-02).

**Covers:** GR-01, GR-02, GR-03, GR-04, GR-05, Q-02.
**Demo:** AC-01 receive 8 of SKU001 → stock 18, outstanding 12, Partially Received, exactly one receipt + one movement; AC-02 resend the same request → original receipt returned, stock stays 18; AC-03 receive 21 → rejected, no receipt/movement, stock stays 10.
**Seams:** controller `call()` against real Postgres.

## Acceptance criteria

- [ ] **AC-01 (GR-01..GR-03):** staff_b01 receiving 8 of SKU001 against PO-DEMO-001 sets B01 stock to 18, outstanding to 12, status Partially Received, with exactly one receipt and one movement.
- [ ] **AC-02 (GR-04):** receiving 8 then resending the same request returns the original receipt; stock stays 18 and cumulative received stays 8; a deliberately new receipt is still possible.
- [ ] **AC-03 (GR-02, GR-05):** attempting to receive 21 is rejected; no receipt or movement is created and stock stays 10.
- [ ] Only Approved or Partially Received orders for the employee's store can be received; products outside the order are rejected; stock increase + movements are atomic.
- [ ] A product deactivated after approval can still be received against that approved order (Q-02).
