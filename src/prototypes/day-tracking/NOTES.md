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

## The four variants

| Key | Name            | Primary affordance                        | Bet                                                                                                                                                                                   |
| --- | --------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Live Chronology | One chronological ledger, live row inside | Past and running work in one order-of-events list; day totals + stacked bar on top; the running row is emphasised but not a hero.                                                     |
| B   | Ribbon + Rows   | Proportional ribbon beside full rows      | Keep the shape of the day (proportions, gaps, now line) in a narrow ribbon; rows stay permanently expanded so short periods and details never need a click.                           |
| D   | Editable Table  | Every cell is an input                    | Dense keyboard-first grid, nothing collapsed: each period is followed by its main stretch and every subtask, with share-of-day per row.                                               |
| E   | Segment Stream  | One flat stream + always-on sidebar       | Since only one thing runs at a time, dissolve the period/subtask nesting: a single chronological stream of segments, period reduced to a gutter bracket, numbers in a sticky sidebar. |

Round-1 variant C (category tiles) was dropped — too cluttered, and it hid the main-category /
subtask distinction the model depends on.

Every variant supports: start (pick main category) · one-click stop at now · start subtask (only when
something is running and no subtask is live) · stop subtask → back to main · retro-log a duration
(`30m`, `0:30`, `0.5`) · fill an untracked gap · edit times/categories · delete.

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
