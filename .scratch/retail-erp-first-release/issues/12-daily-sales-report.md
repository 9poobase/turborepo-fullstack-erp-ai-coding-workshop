## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A manager can view a daily sales report filtered by date range and store that counts only successfully confirmed sales and shows document count, units sold, and total sales amount. A reporting day runs from 00:00:00 inclusive to the next midnight exclusive in Asia/Bangkok, using the sale confirmation timestamp. When no sales match, totals are zero and a clear empty-state message is shown; amounts display to two decimal places.

**Covers:** RPT-01, reporting-day rule.
**Demo:** AC-08 (sales half) — on a day with no sales, the report shows zero totals and an empty state.
**Seams:** controller `call()`; web component (empty state, formatting).

## Acceptance criteria

- [ ] **AC-08 (RPT-01, sales half):** when no sales exist on the selected day, sales totals are zero with a clear empty-state message.
- [ ] The report counts only confirmed sales and shows document count, units sold, and total amount to two decimal places, observable at the controller seam.
- [ ] The day boundary is 00:00:00 inclusive to next midnight exclusive in Asia/Bangkok on the confirmation timestamp, observable at the controller seam.
- [ ] The report filters by date range and store and paginates newest-first with loading/empty/error states at the web component seam.
