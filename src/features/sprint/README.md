# features/sprint/

SprintView — sprint report and Excel export trigger. Derives aggregated TimeEntry hours per category for a sprint date range, shows export status, and drives the WorkbookService export.

## Key concepts

- **Sprint** — a repeating period defined by `sprintStartDate` + `sprintDurationWeeks` in `AppConfig`. All sprint boundaries are derived from those two values; no per-sprint records are stored.
- **SprintGroup** — a grouping of days within a sprint (e.g. by week) used for the report breakdown.
- **ExportStatus** — `pending | exported` per sprint index, persisted in `sprint-exports.json`.
- **TimeEntry** — aggregated `{ category, hours }` record derived from WorkPeriods over the sprint range (see [CONTEXT.md](../../../CONTEXT.md)).

## Files

| File                    | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `SprintView.tsx`        | Root view — sprint selector + report + export button                 |
| `SprintConfigPanel.tsx` | Settings section for sprint length and start date                    |
| `SprintReportPanel.tsx` | Renders the hours breakdown for the selected sprint                  |
| `sprint.ts`             | Sprint boundary calculation (`getSprintByIndex`, `getSprintForDate`) |
| `sprintGroups.ts`       | Groups sprint days for the breakdown display                         |
| `index.ts`              | Public API barrel                                                    |

## How it works

1. `sprint.ts` derives sprint boundaries (start/end date) from config — no stored sprint records.
2. `SprintView` loads all Day records for the sprint's date range via TanStack Query.
3. Category hours are aggregated from WorkPeriods across all days in the range.
4. On export: `SprintReportPanel` calls `WorkbookService.writeSprintData()` (from `features/excel`), then marks the sprint as `exported` in `SprintExportRepository`.
