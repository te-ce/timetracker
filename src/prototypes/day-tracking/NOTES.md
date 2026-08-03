# Prototype — day-view WorkPeriod list & tracking UX

**Question:** the current WorkPeriod list (stacked `PeriodCard`s + `AddPeriodForm`) works, but the
tracking flow feels indirect. What structure should this surface have?

**Shape:** sub-shape A — variants render **on the real day route** (`/?date=…&proto=A`), in place of
`<WorkOverview>`. Real repository, real data, real mutations, real header/overtime bar around them.

Switch with the floating bar at the bottom, or `←`/`→`. `?proto=` is reload-stable and shareable.
Drop the param (or click "exit proto") to get the production UI back.

## The model the variants are designed against (round 2)

1. **Exactly one thing is tracked at a time** — either the open period's own (main) category or the
   live subtask inside it. Never two periods, never two subtasks. Starting a subtask pauses the main
   category; stopping the subtask resumes it.
2. **Starting = choosing the main category** for the work about to happen. That's the only decision.
3. **Subtasks arrive two ways:** tracked live (a different category interrupts the main one), or
   retro-logged as a bare duration ("that was about 30m") when tracking was forgotten. Retro-logged
   subtasks have no times, so they can't be placed on the clock — they are carved out of the main
   stretch's hours instead and rendered as `retro` / "no times".
4. **The user is data-driven.** Totals per category, share of the day, what's running right now, and
   which stretches are untracked all have to be readable without clicking.

`deriveSegments()` in `protoShared.ts` encodes 1–3: it turns a period into the flat chain of segments
that actually happened (main stretch → subtask → main stretch …), which is what every variant renders.

## The variants (round 3)

| Key | Name            | Primary affordance                            | Bet                                                                                                                                                                                               |
| --- | --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Live Chronology | Time stripe + one chronological ledger        | Cumulative total, stacked category bar and "tracking X since HH:MM" on top; the day's shape as a proportional stripe down the left; past and running work in one order-of-events list.            |
| D   | Editable Table  | Every cell is an input                        | Dense keyboard-first grid, nothing collapsed. Kept as the raw-data option — feedback so far: undirected, too much on screen at once.                                                              |
| E   | Segment Stream  | Flat segment stream + always-on right sidebar | One chain of segments (period reduced to a gutter bracket plus a labelled boundary row); breaks called out as breaks; totals, first start, running-since, breaks and at-desk in a sticky sidebar. |

Dropped along the way: **C** (category tiles — cluttered, hid the main/subtask distinction) and
**B** (ribbon + rows — its proportional time stripe was folded into A, which made B redundant).

A and E deliberately diverge on where the numbers live: A puts the day overview on top and the
shape in a left stripe; E puts the numbers in a right sidebar and answers "when did I start / where
are my breaks" with labelled boundary rows instead of a stripe.

Every variant supports: start (pick main category) · one-click stop at now · start subtask (only when
something is running and no subtask is live) · stop subtask → back to main · retro-log a duration
(`30m`, `0:30`, `0.5`) · turn a break into work · edit times/categories · delete.

## Deliberate prototype limits

- Subtask **notes** are displayed but not editable; overlap and overbooking warnings are not
  reproduced (production `SubtaskRow`/`SubtaskEditForm` still own those).
- Retro-logged hours are subtracted from the latest main stretches, so an over-logged period shows a
  shrinking main stretch rather than production's "subtasks exceed period" error.
- No planned-stop handling, no merge-on-edit nuances. Mutations do go through the real
  `useWorkPeriodMutations`, so ⌘Z works.
- Inline edit rows seed local state once; external changes mid-edit are not reconciled.

## Verdict

_TBD — fill in which variant (or which mix) won, and why, then delete this directory, the `proto`
search param in `src/routes/router.ts`, and the `DayTrackingPrototype` branch in `DayView.tsx`._
