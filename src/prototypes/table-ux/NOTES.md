# PROTOTYPE — table-view UX variations

**Question:** what layout makes the month view best at (a) scanning every day at once, (b) reading
how much was worked on a given day, (c) seeing the accumulated over/undertime up to that day, and
(d) tracking work per day?

Three variants, switchable on the real `/table` route via `?tableVariant=`, all on live repository
data (same `useMonthView` the production grid uses):

Round 2 (after feedback "misses the point — all data must always be visible and easily comparable"):
`D`, `E`, `F` keep every number on screen, no hover and no dialog to read a value.

- `live` — current spreadsheet grid, for comparison.
- `D` — **Heat grid.** The full day × category matrix at ~20 px rows, every number printed, each
  cell shaded by how big it is relative to that category's biggest day. Frozen left block is
  day / status / worked (bar behind the number) / day ± / running balance (diverging bar behind the
  number). Week subtotal rows inline, month totals in the footer, note text in its own column.
- `E` — **Transposed matrix.** Days across the top (a month fits one screen-width), categories down
  the side, plus rows for worked / day ± / balance / location-confirm-note. Comparing two days is
  reading neighbouring columns; comparing a category across the month is one horizontal scan.
  Unused category rows dim instead of disappearing so row positions stay stable.
- `F` — **Ledger + aligned charts.** Dense numeric ledger, with a sparkline per category column in
  the header (that column's shape over the month + its month total) and a balance curve drawn down
  the right edge at exactly one row per day, so the trend is readable without giving up any number.
- `A` — **Balance ledger.** One row per day, hours rendered as a stacked category bar with a target
  tick, day ± and running balance as the two right-hand numbers. Categories move from 12 numeric
  columns into one bar + a month legend, so no horizontal scroll. Row click → day dialog.
- `B` — **Week bands.** Month split into week cards; each card header carries worked / target /
  week ± / balance-at-end-of-week. Days are vertical hour columns with the target as a dashed line.
  Running balance also as an area chart above the month. Tile click → day dialog.
- `C` — **Rail + workspace.** Narrow day rail (day, worked, running balance, signed delta bar) next
  to a full-height workspace for the selected day: status, per-category chips, and the real
  `DayTimeline` for editing — tracking without a dialog.

## Trade-offs seen so far

- D fits ~26 days plus subtotals on a 1100 px-tall screen; the heat makes "which category dominated
  this week" readable, but 12+ categories still push the note column off a narrow window.
- E is the only one where every day is a peer on one screen (31 columns ≈ 1150 px), at the cost of
  9 px numbers; needs the expand (↗) mode on a laptop screen.
- F is the best compromise on legibility (11 px numbers, one row per day, whole month + trend on one
  screen) but its comparison aid is the sparkline, which is coarser than D's heat.

**Cross-variant fix from this round:** `day ±` is now blank on days the running balance ignores
(future, non-working, leave, untracked), so the ± column sums exactly to the balance — previously a
vacation day read `-8.00` while the balance was flat, which made both columns untrustworthy.

- A is the closest to the current grid and the cheapest to adopt, but per-category numbers become
  hover/dialog-only.
- B reads over/undertime rhythm best (week is the unit people think in) but is the least dense —
  a month is ~5 screens tall.
- C is the strongest for daily tracking, weakest for "show me the whole month at once" — the rail
  fits ~21 days before scrolling.

## Verdict

_TBD — fill in which variant (or which mix) wins, then delete this directory and fold the winner
into `src/features/table/` properly (with tests; prototype code has none)._

Cleanup checklist when folding in: delete `src/prototypes/table-ux/`, remove the `tableVariant`
search param from `src/routes/router.ts`, and remove the variant imports + switcher from
`src/features/table/TableView.tsx`.
