# PROTOTYPE — month overview variants

**Question:** how should the month view give a general overview of the month _and_ the data
inside it? Today every number (hours, categories, notes, why a day needs review) lives in a
tooltip; the grid itself carries a date and one status dot.

**Shape:** three variants mounted on the real `/month` route via `?variant=`, so they run
against real repository data at real density. `?variant=now` is the shipped view.

- `/month?variant=now` — baseline, what ships today
- `/month?variant=A` — **Ledger Calendar**: keeps the 7-column calendar, puts hours, a
  worked/target bar and the day delta in every cell, adds a week-total column (KW + worked +
  week balance) and an "N days need attention" strip under the grid.
- `/month?variant=B` — **Overview Rail**: no calendar. A sticky left rail carries the
  aggregates (all-time balance, worked vs. month target, category mix, office/leave/unconfirmed
  counts, a clickable "needs attention" list); the main column is a week-grouped day list where
  each row is a category-stacked hours bar with a target tick, hours, and delta.
- `/month?variant=C` — **Rhythm**: no calendar, no list. Hours-per-day bar chart (coloured by
  day status, untracked past workdays drawn as dashed red gaps), running balance trend line,
  weekday averages, category mix, and an inline peek panel for the selected day with
  "Open day →".

Arrow keys / the floating bar cycle variants. The bar is hidden in production builds.

## Where the numbers come from

`monthPrototypeModel.ts` derives one flat model from the existing `useMonthView()` output —
no new queries, no mutations. Category colours use a fixed 4-slot order (indigo, amber, teal,
fuchsia + grey "Rest"), validated for CVD separation; slots are handed to the categories used
in the month, in the user's configured category order.

## Verdict

_(fill in: which variant won, and which pieces to steal from the others)_

## Cleanup

Delete this directory, the `variant` field in `/month`'s `validateSearch` (`src/routes/router.ts`),
and the two PROTOTYPE blocks in `src/features/month/MonthView.tsx`.
