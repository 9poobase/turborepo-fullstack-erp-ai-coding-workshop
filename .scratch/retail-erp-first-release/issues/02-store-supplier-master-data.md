## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

An administrator can create and edit stores and suppliers. Each store has a unique code and name; each supplier has a unique code, name, and contact details. These are the entities a purchase order later references.

This is the first ticket with a list, so it also establishes the shared list conventions the rest of the app reuses: newest-first pagination, loading/success/error states, and the standard Thai error shape `{ code, messageTh, kind: 'input' | 'retry' }`. Later list/error tickets depend on this one.

**Covers:** MD-03; introduces pagination, list states, standard error shape.
**Demo:** Create B01 Central Store, B02 Riverside Store, and supplier SUP01 SupplyOne; creating a second store with code B01 is rejected.
**Seams:** contract schema tests; controller `call()`; web component (list states).

## Acceptance criteria

- [ ] An administrator creates and edits a store (code, name) and a supplier (code, name, contact), observable at the controller seam.
- [ ] Duplicate store code or supplier code is rejected, observable at the controller seam.
- [ ] Store and supplier lists paginate newest-first and expose loading/empty/error states at the web component seam.
- [ ] API errors use the `{ code, messageTh, kind }` shape with a Thai message, observable at the controller seam.
