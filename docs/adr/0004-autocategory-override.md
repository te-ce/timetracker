# 4. AutoCategory override and per-day assignment

Date: 2026-05-19

## Status

Accepted

## Context

AutoCategory was originally a purely derived value: `WorkedHours − Σ manual TimeEntries`, with the target category set once globally in Settings. Two new requirements emerged:

1. The user needs to **override the computed value** for a specific day (e.g. when they know better than the formula).
2. The **target category may vary per day** (e.g. investment day vs. normal Coremedia day).

This turns AutoCategory from a stateless computation into a stateful concept with fallback behaviour.

## Decision

- **Global default + per-day override** for which category receives auto hours.
- **Manual value override** for the computed hours:
  - If a manual value exists for the AutoCategory cell on a given day → use it.
  - If cleared → revert to computed value.
- **No hard constraint** on totals. If `Σ all entries < WorkedHours`, the day shows an "unaccounted hours" visual flag but the user is not blocked.
- Per-day override is stored as an optional field on the day record (not as a TimeEntry).

## Consequences

- `AppConfig.autoCategory` remains the global default.
- A new per-day structure (e.g. `DayOverride { date, autoCategory?, autoCategoryHoursOverride? }`) is needed in persistence.
- The `calculateAutoCategory` function gains an `override` parameter.
- Grid and DayView both allow changing the per-day auto category — UI must stay in sync (same data source via TanStack Query).
- TimeEntry for the auto category is no longer purely virtual — when overridden, it behaves like a manual entry with a special origin.
