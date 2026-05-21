Status: ready-for-agent

# Category start → auto-open WorkWindow

## What to build

When the user starts category tracking in DayView, automatically open a WorkWindow for that day — unless one is already open. This links the two previously independent systems as decided in ADR 0006.

End-to-end scope: category start action → WorkWindow repository check → conditional WorkWindow creation → DayView WorkWindowPanel reflects new open window.

Logic:

1. User presses Start on a category (calls `TimeTrackingRepository.start(date, category)`).
2. Query `WorkWindowRepository.findByDate(date)` for the tracking date.
3. If no window with `end: null` exists → create one: `{ id: uuid, date, start: currentLocalHHMM, end: null }`.
4. If one already exists → skip (same continuous session, different category).

The tracking date (not today's date) is used for the WorkWindow — supports logging for past days.

## Acceptance criteria

- [ ] Starting category tracking creates an open WorkWindow when none exists for that date
- [ ] Starting category tracking does NOT create a WorkWindow when an open one already exists
- [ ] WorkWindow is created on the tracking date (not necessarily today)
- [ ] WorkWindow `start` matches current local HH:MM at the moment Start is pressed
- [ ] WorkWindowPanel shows the new open window without a page reload
- [ ] No TypeScript errors

## Blocked by

- `01-workwindow-nullable-end.md`
