# 03 — Wire MonthGrid Dead Seams

Status: done

## Problem

`MonthGrid` component calls `buildMonthGrid()` with:

```typescript
dayTypes: new Map(),
autoCategoryOverrides: new Map(),
```

The `buildMonthGrid` function's interface promises per-day DayType resolution and AutoCategory overrides, but the caller neuters both by passing empty maps. This is a **leaky seam**: the interface complexity exists but delivers no value. The grid doesn't show non-working days correctly and ignores AutoCategory overrides the user may have set.

## Solution

In `MonthGridView.tsx` (or wherever MonthGrid is mounted):

1. Fetch `dayTypeOverrideRepo.findByDateRange(from, to)` via useQuery
2. Fetch AutoCategory overrides (if a repo exists for them)
3. Pass the real maps into `buildMonthGrid()`

If AutoCategory overrides aren't persisted yet, simplify the `buildMonthGrid` interface to remove the parameter (make the interface honest).

## Files to change

- **Edit**: `src/views/MonthGridView.tsx` — add dayTypeOverride query, pass to MonthGrid
- **Edit**: `src/components/MonthGrid.tsx` — accept and forward dayTypes prop
- **Possibly edit**: `src/domain/monthGrid.ts` — simplify interface if overrides aren't ready

## Acceptance criteria

- [ ] MonthGrid shows non-working days (Vacation, SickDay, etc.) with correct styling
- [ ] No `new Map()` passed where real data should be
- [ ] If a parameter can't be wired yet, it's removed from the interface (honest seam)
- [ ] All existing tests pass

## Benefits

- **Leverage**: the grid shows correct data for the first time
- **Interface honesty**: interface promises only what it delivers
- **Locality**: DayType resolution consistent between MonthView calendar and MonthGrid table
