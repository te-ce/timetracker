# src/domain

Pure business logic. No React, no `fetch`, no repository calls, no side effects.
Every file exports plain functions and types. Every file has a co-located `.test.ts`.

## Invariants

- All dates are `YYYY-MM-DD` strings. Never pass `Date` objects into domain functions.
- Hours are always `>= 0` in results.
- Functions are deterministic given the same inputs.

## Files

| File | Exports | Purpose |
|---|---|---|
| `autoCategory.ts` | `calculateAutoCategory` | Hours remaining after manual entries for the auto-fill category |
| `autoCategoryOverride.ts` | `resolveAutoCategory` | Resolves per-day override → falls back to global default |
| `autoFillRules.ts` | `materializeAutoFillRules`, `AutoFillRule` | Materialises recurring fill patterns into `TimeEntry` objects; skips non-workdays and duplicates |
| `categories.ts` | `getAllCategories` | Merges default + custom categories respecting `categoryOrder`; deduplicates |
| `dateUtils.ts` | `toLocalIso` | `Date → 'YYYY-MM-DD'` in local timezone — use this everywhere, never `.toISOString().slice(0,10)` |
| `dayStatus.ts` | `classifyDay`, `DayStatus` | Single authoritative day classifier → `non-working \| leave \| future \| today \| tracked \| confirmed \| needs-review \| untracked` |
| `daySummary.ts` | `buildMonthSummaries` | Aggregates work periods + entries for all days in a month; returns per-day worked hours, status, overtime |
| `dayType.ts` | `classifyDay`, `isDayTypeOverride`, `getAutoBooking` | Day type: `WorkDay \| Weekend \| PublicHoliday \| Vacation \| SickDay \| Absence`. Leave types auto-book `_LEAVE` |
| `exportStatus.ts` | `shouldAutoExport` | Returns true when a pending sprint's end date + delay threshold has passed |
| `holidays.ts` | `fetchHolidays`, `isPublicHoliday`, `Bundesland`, `BUNDESLAENDER` | Fetches German federal holidays from feiertage-api.de |
| `monthGrid.ts` | `buildMonthGrid`, `MonthGridRow` | Builds spreadsheet rows with per-category hours and unaccounted hours per day |
| `monthStats.ts` | `calculateMonthStats`, `calculateOvertimeToDate` | Monthly totals, target hours, overtime; target only counts days with tracked hours |
| `overtimeCarryOver.ts` | `calculateOvertimeCarryOver` | Cumulates overtime across months; manual overrides apply at their month and carry forward |
| `sprint.ts` | `getSprintBoundaries`, `getSprintForDate`, `aggregateSprintHours`, `SprintConfig` | Sprint date math and per-category hour aggregation |
| `statusColors.ts` | `STATUS_LABEL`, `STATUS_DOT`, `STATUS_CELL`, `STATUS_BADGE`, `STATUS_ROW_BG` | Tailwind class maps for all 7 statuses across all display contexts |
| `workPeriodMerge.ts` | `mergeAdjacentInto` | Merges a work period with any adjacent period whose end/start boundary touches; transitive |
| `worktime.ts` | `calculateWorkedHours`, `calculateRestarbeitszeit` | Sums work period durations (handles midnight spans); computes overtime/undertime |
