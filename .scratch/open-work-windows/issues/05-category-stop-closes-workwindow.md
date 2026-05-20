Status: ready-for-agent

# Category stop → auto-close WorkWindow

## What to build

When the user stops category tracking, close the latest open WorkWindow for that day by setting its end to the current local time.

End-to-end scope: category stop action → find latest open WorkWindow → set end → WorkWindowPanel reflects closed window with duration.

Logic:
1. User presses Stop on a category (calls `TimeTrackingRepository.stop()`), which returns `{ category, date, hours }`.
2. Query `WorkWindowRepository.findByDate(date)` for the tracking date.
3. Find the open window (`end: null`) with the latest `start` time. If none exists, do nothing.
4. Save that window with `end` = current local HH:MM.

## Acceptance criteria

- [ ] Stopping category tracking closes the latest open WorkWindow for that date
- [ ] `end` is set to current local HH:MM at the moment Stop is pressed
- [ ] If multiple open windows exist, the one with the latest `start` is closed
- [ ] If no open window exists, stop completes normally with no WorkWindow side-effect
- [ ] WorkWindowPanel shows the now-closed window with a duration
- [ ] No TypeScript errors

## Blocked by

- `01-workwindow-nullable-end.md`
