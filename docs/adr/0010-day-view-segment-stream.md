# ADR 0010: The day view renders one segment stream, not a stack of period cards

## Status

Accepted (2026-08-03)

## Context

DayView showed each WorkPeriod as a card: a header with the times, a row for the period's own category, one row per subtask, a footer with "Start tracking subtask" / "Log subtask", and a separate add-period form at the bottom. Four prototype variants were built against the real day route (`src/prototypes/day-tracking/`, since deleted) and compared on real data.

What that comparison surfaced:

- The primary action — start or stop working — was the least prominent thing on screen, buried in a form under the list. Stopping took two steps: press Stop, then commit a time.
- Card chrome per period made short periods (a 7-minute interruption) as heavy as a 4-hour block, and hid detail behind expand/collapse.
- The day's shape was invisible: no sense of when work started, how long the gaps were, or how much of the day is accounted for.
- The domain rule "only one thing is tracked at a time" (the WorkPeriod's own category **or** its live subtask, never both, never two open periods) was not expressed anywhere in the UI.
- Time between WorkPeriods was not shown at all, so a forgotten stop looked identical to a break.

## Decision

Render the day as **one ordered stream of Segments** with a single tracking control and a totals panel.

1. **Segment is the rendering unit.** `deriveSegments()` turns a WorkPeriod into the chain that actually happened: main stretch → subtask → main stretch → …, with retro-logged subtasks appended as unplaced Segments whose hours are carved out of the main stretch. The UI never re-derives this per component.
2. **Breaks are derived and shown.** `findBreaks()` measures the time between WorkPeriods from the latest end so far, so overlaps and back-to-back periods yield nothing while the gap before an Open WorkPeriod is reported. Every break is offered as "it was work — fill", which merges it into the preceding period.
3. **One tracking control.** `TrackingBar` has exactly one primary action at a time: start (choose the main category), stop work, start subtask (only while something runs and no subtask is live), stop subtask. On a day that is not today it becomes a "log work" form with start and end, because live tracking is meaningless there.
4. **Numbers stay on screen.** `DayTotalsPanel` shows worked hours, per-category totals, first start, running-since or last stop, break count and total, and AtDesk. It is switched off (`showTotals={false}`) where the host is narrow, e.g. the month table's day dialog, which renders the same timeline.
5. **Planned stops are today-only.** Domain helpers take `{ isToday }`; a period ending at 17:00 on a past day is closed, not "running because the wall clock says 14:00".

Deleted with this change: `WorkOverview`, `PeriodCard`, `CardHeader`, `AutoCategoryRow`, `SubtaskRow`, `LiveSubtaskBanner`, `PeriodCardFooter`, `AddPeriodForm`, `StartSubtaskForm`, `NowChip`, `periodCardModel`. Kept and reused: `CategoryPicker`, `SubtaskForm` (retro logging with a note), `SubtaskEditForm` (editing a subtask's category, duration/times and note), `ConfirmDialog`.

## Consequences

- ✅ The day reads as a chronology: when work started, what interrupted it, where the breaks are, what is running now.
- ✅ Start and stop are one click each; stopping no longer requires confirming a time.
- ✅ Subtasks are always visible — nothing can be forgotten behind a collapsed row.
- ✅ Domain logic (`daySegments`, `dayBreaks`, `dayStreamModel`) is pure and unit-tested; components only render and dispatch mutations.
- ✅ The month table's day dialog and the day view share one implementation.
- ❌ Segment derivation runs on every render of the timeline; fine at a day's scale, but it is not memoised.
- ❌ Retro-logged hours are subtracted from the latest main stretches, so an over-logged period shows a shrinking main stretch **and** an "exceeds this work period" warning rather than a single explanation.
- ❌ Creating a period on a past day is a different control from tracking on today; two paths to learn instead of one.
