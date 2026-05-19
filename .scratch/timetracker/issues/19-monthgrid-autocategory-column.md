Status: ready-for-agent

# #19 MonthGrid — AutoCategory column with override

## What to build

Add the AutoCategory column to MonthGrid. Shows computed value (greyed out) per day. Accepts manual override (types a number → stored as override, clears → reverts). Per-day category selector accessible from the grid. Visual flag for unaccounted hours.

## Acceptance criteria

- [ ] AutoCategory column appears in grid (visually distinct — greyed/dashed)
- [ ] Computed value shown when no override exists
- [ ] Typing a value stores hours override; cell un-greys
- [ ] Clearing reverts to computed value
- [ ] Per-day AutoCategory selector accessible (e.g. click category header in row)
- [ ] Unaccounted hours flag displayed when `WorkedHours − Σ entries > 0`
- [ ] Component tests: computed display, override edit/clear, category change, flag

## Blocked by

- #16 AutoCategory hours override
- #18 MonthGrid — inline editing
