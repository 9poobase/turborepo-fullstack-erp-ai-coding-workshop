## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

The system knows the four RetailOne roles and which store a user belongs to. Signing in as any of the demo accounts returns the correct role and store assignment, and the API's role/store authorization is built on this foundation.

This replaces the starter's `ADMIN`/`STAFF` roles with Administrator, Purchasing officer, Store employee, and Manager, and adds store membership to users. It is the expand step of the role/store change: the new shape is added and the existing auth path (role decorator, auth guard, seed/demo accounts) is migrated onto it.

**Covers:** Section 2 roles, NFR-01 (authorization foundation).
**Demo:** Sign in as buyer01, staff_b01, staff_b02, manager01; `auth.me` returns each one's role and assigned store.
**Seams:** contract schema tests; controller `call()`.

## Acceptance criteria

- [ ] The role vocabulary is Administrator, Purchasing officer, Store employee, Manager (the starter's `ADMIN`/`STAFF` no longer resolve), observable at the contract schema seam.
- [ ] A user carries a store assignment; a store employee resolves to exactly one store, observable via the signed-in-user response at the controller seam.
- [ ] Demo accounts buyer01, staff_b01 (B01), staff_b02 (B02), manager01 exist with the Section 8.1 roles/stores and can sign in.
- [ ] A route restricted to a role rejects a user without it (403) at the controller seam.
