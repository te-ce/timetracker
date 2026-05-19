# 02 — DaySummary Domain Module

Status: ready-for-agent

## Problem

Three places independently loop over days-in-month to compute per-day state:

1. `MonthView.tsx` (lines 58–99) — computes workedHours, entryTotals, dayType, dayStatus
2. `domain/monthGrid.ts` (buildMonthGrid) — computes workedHours, entries by category, autoCategory, unaccountedHours
3. `MonthGrid.tsx` component — calls buildMonthGrid with partial inputs

Each groups windows/entries by date, calls `calculateWorkedHours`, resolves day types — but with slightly different inputs/outputs. Understanding "what is the computed state of a day?" requires reading all three. There is no **locality** for this concept.

## Solution

Create a `DaySummary` module at `src/domain/daySummary.ts`:

```typescript
interface DaySummary {
  date: string
  dayType: DayType
  workedHours: number
  entryTotal: number
  isEntriesBalanced: boolean
  dayStatus: DayStatus
}

interface DaySummaryInput {
  windows: WorkWindow[]
  entries: TimeEntry[]
  dayTypeOverrides: Map<string, DayTypeOverride>
  today: string
  hasAnyTrackedHours: boolean
}

function buildDaySummary(date: string, input: DaySummaryInput): DaySummary
function buildMonthSummaries(year: number, month: number, input: DaySummaryInput): DaySummary[]
```

`MonthView` and `MonthGrid` both consume `buildMonthSummaries()` instead of implementing their own loops.

## Files to change

- **Create**: `src/domain/daySummary.ts`
- **Create**: `src/domain/daySummary.test.ts`
- **Refactor**: `src/views/MonthView.tsx` — replace inline loops with `buildMonthSummaries()`
- **Refactor**: `src/domain/monthGrid.ts` — delegate per-day logic to `buildDaySummary`
- **Update**: `src/domain/monthGrid.test.ts` if interface changes

## Acceptance criteria

- [ ] `buildDaySummary` is a pure function with comprehensive unit tests
- [ ] `MonthView` no longer contains per-day computation loops
- [ ] `buildMonthGrid` delegates to `buildDaySummary` for per-day state
- [ ] All existing tests pass
- [ ] DaySummary concept added to CONTEXT.md

## Benefits

- **Locality**: "what state does a day have?" answered in one place
- **Leverage**: MonthView, MonthGrid, and SprintView all use the same function
- **Testability**: one module to test instead of testing the same logic through three UI paths

## Dependencies

None — can be implemented independently.
