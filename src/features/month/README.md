# features/month/

MonthView — the default landing view. A ledger calendar: every day cell carries its worked hours, a worked-vs-target bar and its balance, each calendar row ends in a week-total column, and the month's progress plus everything that needs attention sits above and below the grid. Read-only surface; editing happens in DayView.

## Key concepts

- **DaySummary** — computed state for one day: resolved DayType, WorkedHours, balance, DayStatus.
- **DayStatus** — `complete | needs-review | untracked | future | today | non-working | leave` (see [CONTEXT.md](../../../CONTEXT.md)).
- **MonthOverview** — the display view-model over a month's DaySummaries: per-day hours/target/balance, ISO-week totals, month progress percentages, and the days needing attention.
- **OvertimeCarryOver** — accumulated overtime hours from previous months, folded into the balance shown in the progress meter.

## Files

| File                      | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `MonthView.tsx`           | Root view — nav + progress meter + calendar + attention strip          |
| `MonthCalendar.tsx`       | Ledger day cells and week totals; click → navigate to DayView          |
| `MonthProgressMeter.tsx`  | Worked vs. month target, with a notch for the target due so far; chips |
| `MonthAttentionStrip.tsx` | Chips for the days that need work; click → navigate to DayView         |
| `MonthNav.tsx`            | Previous/next month navigation controls                                |
| `MonthStatsPanel.tsx`     | Summary: workdays, worked hours, overtime, carry-over                  |
| `OvertimeBar.tsx`         | Live overtime bar — used by the Table view                             |
| `StatusLegend.tsx`        | Color legend for day status dots                                       |
| `monthOverview.ts`        | `buildMonthOverview()` — DaySummary[] → MonthOverview                  |
| `monthBalanceFormat.ts`   | Signed over/undertime text and its color                               |
| `daySummary.ts`           | `buildMonthSummaries()` — derives DaySummary[] for a full month        |
| `index.ts`                | Public API barrel                                                      |

## How it works

1. TanStack Query loads the `Day[]` records for the selected month.
2. `buildMonthSummaries()` derives a `DaySummary` for each calendar day (1–31), including days with no recorded data.
3. `buildMonthOverview()` turns those summaries plus the per-day target hours into the `MonthOverview`: day ledgers, ISO-week totals, month percentages, attention list.
4. `MonthCalendar` renders each cell from `DaySummary.displayStatus` (cell color, dot) and the overview's day ledger (hours, bar, balance); each row's last column is that ISO week's total.
5. Today is drawn in its **own** status color (not a neutral "today" surface) and marked with an amber inset ring, a `Today` label and the orange day-number pill — so it reads both as today and as how today is going. Future days are faded, which leaves untracked past days as the only loud gaps in the grid.
6. A day balance is only shown once it is knowable — a future date, or a day with nothing tracked, shows none rather than a full negative.
7. Week and month targets count only days with tracked hours, the same rule the overtime math uses; untracked past workdays surface as gaps in the attention strip and the "N days untracked / Xh missing" chip instead.

Carry-over math (`calculateOvertimeCarryOver` — scans all months before the current one, summing `(workedHours - targetHours)` per month) lives in `src/shared/overtimeCarryOver.ts`, since `composeMonthOvertime` (used by both this feature and Day view) seeds its running total from it via `loadOvertimeCarryOverBeforeMonth`.
