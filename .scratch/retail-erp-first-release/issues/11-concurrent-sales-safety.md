## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

Concurrent transactions on the same product and store never lose an update, and confirmation always validates the authoritative stock balance rather than the value shown in the browser. Two simultaneous sales that would together exceed the balance cannot both succeed.

**Covers:** INV-04.
**Demo:** AC-07 with SKU001 at 10, two concurrent sales of 7 each — exactly one succeeds, the other is rejected, and final stock is 3.
**Seams:** controller `call()` against real Postgres, exercised concurrently.

## Acceptance criteria

- [ ] **AC-07 (INV-04):** two concurrent sales of 7 against a stock of 10 result in exactly one success, one rejection, and a final stock of 3.
- [ ] Confirmation re-validates the authoritative balance inside the transaction; the browser-supplied balance is never trusted.
- [ ] No lost update occurs under concurrency, observable at the controller seam against real Postgres.
