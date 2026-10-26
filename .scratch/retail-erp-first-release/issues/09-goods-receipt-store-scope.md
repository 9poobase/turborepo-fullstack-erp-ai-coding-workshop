## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

Store-scope authorization is enforced at the API for goods receipt. A store employee cannot receive goods for a store they are not assigned to, even via a direct API request, and no business data changes when such a request is rejected. Managers and administrators act across all stores.

**Covers:** GR-01, NFR-01.
**Demo:** AC-04 a direct API request by staff_b02 to receive goods for B01 is rejected and nothing changes.
**Seams:** controller `call()` against real Postgres.

## Acceptance criteria

- [ ] **AC-04 (GR-01, NFR-01):** a direct API receive request by staff_b02 for B01 is rejected (403) and no business data changes.
- [ ] A manager or administrator can receive across stores, observable at the controller seam.
- [ ] Authorization is enforced at the API, not only by hiding UI, observable by calling the handler directly.
