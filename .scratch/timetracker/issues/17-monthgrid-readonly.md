Status: ready-for-agent

# #17 MonthGrid — read-only view

## What to build

A new spreadsheet-like view showing all TimeEntry data for one month. Rows represent days (1–31), columns represent all categories (fixed + dynamic). A read-only WorkedHours column provides context. Non-WorkDay rows are visually muted. Month navigation (prev/next/current).

This slice is read-only — no editing. Editing comes in #18.

## Acceptance criteria

- [ ] New MonthGrid view accessible from sidebar navigation
- [ ] Grid renders rows for each day of the selected month
- [ ] Columns for all categories (fixed + dynamic) show booked hours
- [ ] Read-only WorkedHours column shows Σ WorkWindow durations per day
- [ ] Weekend / holiday / vacation rows are visually muted
- [ ] Month navigation: prev, next, current month buttons
- [ ] Clicking a day row navigates to DayView for that date
- [ ] Component tests: grid renders data, navigation works, muted rows

## Blocked by

None - can start immediately
