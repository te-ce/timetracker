# features/

Feature verticals. Each feature owns its components, hooks, and domain logic as a flat directory. Features are self-contained — no feature imports from another feature's internals. Cross-feature imports go through the barrel `index.ts`.

## Contents

| Feature                           | Route               | What it does                                                   |
| --------------------------------- | ------------------- | -------------------------------------------------------------- |
| [`day/`](day/README.md)           | `/day/:date`        | DayView, WorkPeriod editing, live category tracking, subtasks  |
| [`month/`](month/README.md)       | `/` (default)       | Monthly calendar grid, day status dots, overtime carry-over    |
| [`table/`](table/README.md)       | `/table`            | Spreadsheet-like view of hours per category per day            |
| [`sprint/`](sprint/README.md)     | `/sprint`           | Sprint report, aggregated TimeEntry hours, Excel export        |
| [`settings/`](settings/README.md) | `/settings`         | All app configuration — categories, AutoFill, sync, MSAL setup |
| [`excel/`](excel/README.md)       | (service, no route) | WorkbookService — reads/writes SharePoint or local Excel files |

## Rules

- Each feature directory is flat: components, hooks, domain logic, and tests all at the same level
- Every feature exposes a public API via its `index.ts` barrel
- Other features and `shared/` import from `'../day'`, never `'../day/dayContext'`
- Domain logic (pure functions) must be separate from UI — no component file mixes both
- Every new domain function and every new component behavior needs a test
