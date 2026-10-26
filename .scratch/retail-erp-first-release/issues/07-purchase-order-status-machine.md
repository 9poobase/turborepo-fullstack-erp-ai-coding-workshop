## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A purchase order moves through its lifecycle under a strict status machine. A draft is submitted for approval; a manager approves or rejects it with a reason. Approved lines, quantities, prices, and destination store cannot change. A rejected order stays viewable and resubmission needs a new order. Only Draft or Pending Approval orders can be cancelled, by the creator or a manager, with a reason. Creating or approving an order never changes stock.

**Covers:** PO-02, PO-03, PO-04.
**Demo:** Submit and approve PO-DEMO-001; an edit after approval is rejected; cancel a draft with a reason; stock is unchanged throughout.
**Seams:** controller `call()`.

## Acceptance criteria

- [ ] Status transitions follow Draft → Pending Approval → Approved/Rejected, with approve/reject requiring a manager and a reason; illegal transitions are rejected at the controller seam.
- [ ] After approval, lines, quantities, prices, and destination store are immutable, observable at the controller seam.
- [ ] A rejected order remains viewable; cancellation is allowed only from Draft or Pending Approval, by creator or manager, with a reason.
- [ ] Creating or approving an order causes no stock movement.
