# src/hooks

React Query hooks. Fetch data, run domain computations, return derived state. Views and components consume these — they do not call repositories directly.

## Rule: all cache keys through `queryKeys.ts`

Never write `useQuery({ queryKey: ['something', id] })` inline. Always use a factory from `QUERY_KEYS`:

```typescript
import { QUERY_KEYS } from './queryKeys'
useQuery({ queryKey: QUERY_KEYS.timeEntriesByDate(date), ... })
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })
```

## `queryKeys.ts`

Single source of truth for all cache key shapes. Hierarchical — `timeEntriesAll` is a prefix of `timeEntriesByDate(date)`, so invalidating the former invalidates the latter. Tagged variants (e.g. `workWindowsByMonthTagged(year, month, 'dayOvertime')`) prevent cross-contamination between queries that fetch the same data for different purposes.

## Data hooks

### `useMonthQuery(year, month)`

Fetches everything needed to render a month view. Returns:

```
config, summaries, dayTypeOverrides, workLocations, confirmedDays,
overtimeToDate, trackedWorkDays, officeDays, officePercent, sollstunden, todayIso
```

`summaries` is the result of `buildMonthSummaries` — a `{ days, workedHoursPerDay }` object covering every day in the month.

### `useDayQuery(date)`

Fetches day-level data plus the surrounding month (for overtime context). Returns:

```
config, windows, entries, workLocation, autoCategoryOverride, isConfirmed,
workedHours, manualTotal, autoCategory, selectedDayType,
isEntriesBalanced, hasAutoCategory, dayClassification, effectiveLocation,
defaultWorkLocation, sollstunden, overtimeToDate, todayIso
```

`dayClassification` is a `{ displayStatus, reason }` object from `classifyDay`.

### `useRemainingHours()`

Reads today's `workedHours` and `sollstunden` from `useDayQuery`. Side effects: updates `document.title` with remaining hours and calls `navigator.setAppBadge()` when supported. Returns `{ remaining, sollstunden, workedHours }`.

### `useHolidays(federalState, year)`

Fetches public holidays for a German Bundesland. 24-hour stale time. Disabled when `federalState` is null.

## Mutation hooks

### `useTimeEntryMutations(repository)`

```typescript
save.mutate({ entry: TimeEntry, previous: TimeEntry | null })
remove.mutate(entry: TimeEntry)  // full entity, not just id
```

Both push undo/redo commands to `useUndoStore`. Invalidate `QUERY_KEYS.timeEntriesAll` on success.

### `useWorkPeriodMutations(repository)`

```typescript
save.mutate(window: WorkPeriod)
remove.mutate(id: string)
```

Invalidates `QUERY_KEYS.workWindowsAll`. Does **not** push undo commands (merge operations are not cheaply invertible).

### `useDayTypeOverrideMutations(repository)`

```typescript
save.mutate({ date, dayType })
remove.mutate(date)
```

Invalidates both the specific date key and the all-overrides key.
