# 05 — Wire AutoCategory Override in DayView

Status: done

## Problem

In `DayView.tsx` (lines 59-63):

```typescript
const autoCategory = resolveAutoCategory({
  date: selectedDate,
  globalDefault: config?.autoCategory ?? null,
  dayOverrides: new Map(),  // ← always empty
})
```

The `resolveAutoCategory` function's interface accepts per-day overrides, but DayView never loads them. If the user sets a per-day AutoCategory override via MonthGrid, it won't be reflected when viewing that day in DayView. The seam exists but is dead.

## Solution

1. Fetch AutoCategory day overrides from a repository (or from config if stored there)
2. Pass the real override map to `resolveAutoCategory()`

This may require checking where per-day AutoCategory overrides are persisted. If they're in the same `day-type-override-repository` or a separate store, wire it up.

## Files to change

- **Edit**: `src/views/DayView.tsx` — load overrides, pass to `resolveAutoCategory`
- **Possibly edit**: repository layer if override storage needs to be queried

## Acceptance criteria

- [ ] DayView shows the correct AutoCategory when a per-day override exists
- [ ] No `new Map()` passed where real data should be
- [ ] Verified by manually setting an override in MonthGrid and confirming DayView reflects it

## Benefits

- **Functional correctness**: per-day AutoCategory overrides actually work in DayView
- **Interface honesty**: the function receives what it was designed for
- **Small scope**: minimal change with clear user-facing impact
