## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

In an agreed test environment seeded with 1,000 products and 10,000 movements, the search and stock-view APIs hold a p95 response time of no more than 2 seconds with 10 simulated concurrent users over a continuous 5-minute test. CSV exports are excluded from this target.

**Covers:** NFR-05.
**Demo:** A load-test report showing p95 ≤ 2s for search and stock-view under 10 concurrent users for 5 minutes at the seeded scale.
**Seams:** load test (separate, non-gating).

## Acceptance criteria

- [ ] A seed produces 1,000 products and 10,000 movements in the test environment.
- [ ] A load test drives 10 concurrent users for a continuous 5 minutes against the search and stock-view APIs.
- [ ] The measured p95 for search and stock-view is no more than 2 seconds; the report is captured as NFR-05 evidence.
