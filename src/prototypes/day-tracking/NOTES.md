# Prototype — day-view WorkPeriod list & tracking UX

**Question:** the current WorkPeriod list (stacked `PeriodCard`s + `AddPeriodForm`) works, but the
tracking flow feels indirect. What structure should this surface have?

**Shape:** sub-shape A — variants render **on the real day route** (`/?date=…&proto=A`), in place of
`<WorkOverview>`. Real repository, real data, real mutations, real header/overtime bar around them.
Everything outside the work-periods section is untouched.

Switch with the floating bar at the bottom, or `←`/`→`. `?proto=` is reload-stable and shareable.
Drop the param (or click "exit proto") to get the production UI back.

## Pain points the variants react to

- Starting tracking means reading a form at the bottom of the list; the primary action is the least
  prominent thing on screen.
- Stopping is two steps: `Stop` opens a time-edit row, then you commit. One click should mean "stop now".
- No sense of the day's _shape_ — proportions, gaps between periods — only a list of rows.
- Period vs subtask distinction carried by small type and indentation, plus lots of tiny text buttons
  (`+ Log subtask`, `▶ Start tracking subtask`, `Stop subtask`) competing for the same visual level.

## The four variants

| Key | Name           | Primary affordance                | Bet                                                                                                                   |
| --- | -------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| A   | Hero Timer     | One big Stop / Start button       | Now-state dominates; history compresses to one dense line per period.                                                 |
| B   | Time Grid      | Direct manipulation on a timeline | Day as proportional blocks against a live `now` line; gaps are visible and one-click fillable.                        |
| C   | Category Tiles | Tap a category                    | Tracking = tapping a tile. Tapping another chains (stop now + start now). No forms, no time inputs on the happy path. |
| D   | Editable Table | Every cell is an input            | No edit mode, no cards. Keyboard-first grid; draft row at the bottom, subtasks expand inline.                         |

## Deliberate prototype limits

- Subtask editing is shallow (start/stop live, delete, view). Notes, hours-only subtasks and overlap
  warnings are not reproduced — the production `SubtaskRow`/`SubtaskEditForm` still own those.
- No merge-on-adjacent-edit, no planned-stop handling, no undo affordances beyond the shared undo stack
  (mutations go through the real `useWorkPeriodMutations`, so ⌘Z still works).
- Inline edit rows seed local state once; external changes mid-edit are not reconciled.

## Verdict

_TBD — fill in which variant (or which mix) won, and why, then delete this directory and the `proto`
search param in `src/routes/router.ts` plus the `DayTrackingPrototype` branch in `DayView.tsx`._
