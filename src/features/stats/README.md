# features/stats/

StatsView — all-time statistics and fun facts over every month of tracked data. Read-only: no mutations, no navigation, no config writes.

## Key concepts

- **AllTimeStats** — one flat record of every figure the view shows, built by `buildAllTimeStats` from whole `MonthData` objects. Days with no tracked hours are excluded from totals, averages and the balance — the same "tracked days only" rule the month overtime math uses.
- **Streaks** — a run of consecutive tracked WorkDays. Non-WorkDays (weekends, holidays, leave) neither extend nor break a run, so a normal Mon–Fri week reads as 5. A gap in stored months breaks a run; today counts only if it already has hours, so an untracked morning does not look like a broken streak.
- **Fun facts** — the narrative layer over `AllTimeStats`. Each fact is dropped when the data can't support it, so a thin history shows fewer facts rather than facts about nothing.

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
4. `StatsView` formats numbers through `formatHours`/`formatSignedHours`, so the hh:mm ↔ decimal setting applies here too.
