# features/month/

MonthView — the default landing view. Renders a calendar grid for the selected month with per-day status dots, a stats panel, and overtime carry-over display. Read-only navigation surface; editing happens in DayView.

## Key concepts

- **DaySummary** — computed state for one day: resolved DayType, WorkedHours, balance, DayStatus.
- **DayStatus** — `complete | needs-review | untracked | future | today | non-working | leave` (see [CONTEXT.md](../../../CONTEXT.md)).
- **OvertimeCarryOver** — accumulated overtime hours from previous months, displayed in the stats panel.

## Files

| File                  | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `MonthView.tsx`       | Root view — nav + calendar + stats                              |
| `MonthCalendar.tsx`   | Grid of day cells with status dots; click → navigate to DayView |
| `MonthNav.tsx`        | Previous/next month navigation controls                         |
| `MonthStatsPanel.tsx` | Summary: workdays, worked hours, overtime, carry-over           |
| `OvertimeBar.tsx`     | Visual bar showing overtime vs. target hours                    |
| `StatusLegend.tsx`    | Color legend for day status dots                                |
| `daySummary.ts`       | `buildMonthSummaries()` — derives DaySummary[] for a full month |
| `monthStats.ts`       | Aggregate stats across the month (totals, averages)             |
| `index.ts`            | Public API barrel                                               |

## How it works

1. TanStack Query loads the `Day[]` records for the selected month.
2. `buildMonthSummaries()` derives a `DaySummary` for each calendar day (1–31), including days with no recorded data.
3. `MonthCalendar` renders each day cell using the `DaySummary.displayStatus` to pick dot color.
4. `MonthStatsPanel` aggregates totals from the `DaySummary[]` array and adds carry-over overtime from prior months.

Carry-over math (`calculateOvertimeCarryOver` — scans all months before the current one, summing `(workedHours - targetHours)` per month) lives in `src/shared/overtimeCarryOver.ts`, since `composeMonthOvertime` (used by both this feature and Day view) seeds its running total from it via `loadOvertimeCarryOverBeforeMonth`.
