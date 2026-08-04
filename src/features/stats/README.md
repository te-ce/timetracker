# features/stats/

StatsView — all-time statistics and fun facts over every month of tracked data. Read-only: no mutations, no navigation, no config writes.

## Key concepts

- **AllTimeStats** — one flat record of every figure the view shows, built by `buildAllTimeStats` from whole `MonthData` objects. Days with no tracked hours are excluded from totals, averages and the balance — the same "tracked days only" rule the month overtime math uses.
- **Longest workday streak** — the longest run of consecutive tracked WorkDays. Weekends and public holidays are skipped, so a normal Mon–Fri week reads as 5; vacation and sick days break the run, since the streak is about uninterrupted working days. A gap in stored months breaks it too.
- **Fun facts** — the narrative layer over `AllTimeStats`. Each fact is dropped when the data can't support it, so a thin history shows fewer facts rather than facts about nothing.
- **Stat families** — beyond the flat totals, `AllTimeStats` groups related figures: `rhythm` (usual start slot, start spread, early starts, late finishes), `breaks` (gaps between periods, plus the window the main break usually falls in — averaged over each day's longest gap, so short gaps don't drag it), `weeks` (biggest ISO week), `extremes` (best/worst day balance, median day, weekend hours, longest absence) and `discipline` (notes, subtasks).

## Files

| File                 | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `StatsView.tsx`      | Root view — headline cards, breakdown bars, fun facts                    |
| `StatBarList.tsx`    | Labelled horizontal-bar list, used for the weekday/category/month splits |
| `allTimeStats.ts`    | Pure domain — derives `AllTimeStats` from stored months                  |
| `funFacts.ts`        | Pure domain — turns `AllTimeStats` into one sentence per fact            |
| `useAllTimeStats.ts` | Loads every stored month and feeds `buildAllTimeStats` from the clock    |

No `index.ts` barrel: nothing outside this feature imports from stats, and knip fails on an unimported barrel file. Add one when a second feature needs these types.

## How it works

1. `useAllTimeStats` reads `monthRepo.getAllMonths()` and fetches each month, cached under `QUERY_KEYS.allMonthsData`. Every month mutation invalidates that key via the `invalidateMonth*` helpers.
2. `buildAllTimeStats` flattens the months into per-day facts through `deriveMonthDayCores` (shared with MonthView and TableView, so day classification and WorkedHours agree across views), then derives totals, records, weekday/category/month splits and streaks.
3. `now` comes from `useClock`, ticking only while today has a live or planned-stop period — today's in-progress hours count toward the totals.
4. Two rows of four cards: general stats (total, balance, average day with its usual start → end, longest workday streak) and records (office share, longest day, shortest day, typical break with the window it usually falls in). Everything else lands in the fun-facts list.
5. `StatsView` formats numbers through `formatHours`/`formatSignedHours`, so the hh:mm ↔ decimal setting applies here too.
