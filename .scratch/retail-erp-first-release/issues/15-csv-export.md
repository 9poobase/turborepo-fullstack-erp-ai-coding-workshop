## Parent

Part of #1 (Retail ERP: first release baseline).

## What to build

A manager can export sales and stock reports as CSV that supports Thai text and opens correctly in spreadsheet software. The export applies the same filters and permissions as the on-screen report, and any value a spreadsheet might interpret as a formula is handled safely.

**Covers:** RPT-04.
**Demo:** Export the B01 stock report to CSV and open it in Excel with Thai text intact; a product named `=cmd` exports as an escaped, inert value.
**Seams:** controller `call()`; web component (escaping helper).

## Acceptance criteria

- [ ] Sales and stock reports export as CSV with Thai text rendering correctly in spreadsheet software (UTF-8 with BOM), observable at the controller/web seam.
- [ ] Cells beginning with `=`, `+`, `-`, `@`, tab, or carriage return are escaped so they are not interpreted as formulas, observable at the web component seam.
- [ ] The export applies the same filters and permissions as the on-screen report.
