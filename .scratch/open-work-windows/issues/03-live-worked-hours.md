Status: ready-for-agent

# Live WorkedHours for open WorkWindows

## What to build

Make WorkedHours reflect in-progress sessions: an open WorkWindow contributes `now − start` to the daily total, updated on a 1-minute tick in DayView.

End-to-end scope: domain function signature → WorkWindowPanel live interval → Worked/Remaining stats display.

`calculateWorkedHours` gains an optional `now` parameter (local `HH:MM` string or `Date`). When provided, open windows contribute their live duration. When omitted, open windows are skipped (existing behaviour, used in batch/server contexts).

WorkWindowPanel sets up a 1-minute interval that re-computes `workedHours` and `restarbeitszeit` by passing the current time. No new network calls — purely local recalculation.

## Acceptance criteria

- [ ] `calculateWorkedHours(windows, now?)` accepts an optional current-time argument
- [ ] Open window contributes `now − start` when `now` is provided
- [ ] WorkWindowPanel re-renders worked/remaining stats once per minute when an open window exists
- [ ] Interval is cleared on unmount (no memory leak)
- [ ] When no open window exists, no interval runs
- [ ] Unit tests for `calculateWorkedHours` cover the open-window live-duration case
- [ ] No TypeScript errors

## Blocked by

- `01-workwindow-nullable-end.md`
