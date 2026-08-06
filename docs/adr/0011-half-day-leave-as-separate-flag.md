# ADR 0011: Half-Day Leave Is a Separate `Day` Flag, Not a `dayTypeOverride`

## Status

Accepted

## Context

Users need to flag a day as half leave (Vacation or SickDay) while still logging WorkPeriods and hours for the other half. `dayTypeOverride` (`DAY_TYPE_OVERRIDES`) already models full-day Vacation/SickDay, but setting it reclassifies the whole day: `classifyDay` short-circuits to the `leave` status, work periods are hidden in the Day view (`isLeaveDay` in `DayView.tsx`), and the day's full target is excluded from overtime entirely.

Two options:

**Option A — Extend `dayTypeOverride` with `HalfVacation`/`HalfSickDay` values.** Reuses the existing exclusive-choice field; every `dayTypeOverride` consumer (classification, DayTimeline visibility, leave auto-booking) would need a new branch to treat these as "WorkDay, but...".

**Option B — Add `Day.halfDayLeave?: 'Vacation' | 'SickDay'`, orthogonal to `dayTypeOverride`.** The day stays `WorkDay` (or whatever `dayTypeOverride`/`classifyDayType` already resolves), so normal classification and work-logging keep working unmodified. Only the target-hours calculation and category auto-booking need to consult the new flag.

Option B was chosen: half-day leave isn't a day _type_ (it doesn't change what kind of day this is), it's a modifier on top of a WorkDay that halves the expected hours. Modelling it as a second field keeps `dayTypeOverride` exclusive and every existing full-day-leave code path untouched.

## Decision

Add `halfDayLeave?: 'Vacation' | 'SickDay'` to `Day`, independent of `dayTypeOverride`.

- `effectiveTargetHours(date, weekdayHours, halfDayLeave)` (`shared/weekdayHours.ts`) halves the weekday target when set; this is threaded through as `targetHours` on `MonthDayCore` and `DaySummary` so every overtime/target consumer (month overview, table, day view, all-time stats) reads one already-halved number instead of each recomputing `targetHoursForDate` independently.
- `calculateDayCategoryHours` auto-books `_LEAVE` for half the weekday target when `halfDayLeave` is set, in addition to (not instead of) whatever hours are logged that day — unlike the full-day-leave auto-booking, which only applies when nothing is logged.
- `classifyDay` and `isLeaveDay` in `DayView` are untouched: a half-day-leave day is still classified purely from its actually-worked vs. target hours, same as any WorkDay.
- `isDayEmpty` (`abstract-month-repository.ts`) checks `halfDayLeave` alongside the other day fields, so a day with only a half-day-leave flag and no logged windows isn't pruned as empty.

## Consequences

- ✅ No change to `classifyDay`, `dayTypeOverride` validation, or the full-day leave path.
- ✅ Every overtime/target call site was already funneled through `MonthDayCore`/`DaySummary.targetHours` as part of this change, closing the door on a call site quietly recomputing the un-halved target via `targetHoursForDate` directly.
- ❌ Two independent leave concepts now exist on `Day` (`dayTypeOverride: 'Vacation' | 'SickDay'` for a full day, `halfDayLeave` for half) — a caller checking one without the other will miss half of the "is this day leave in some way" question. Both are consulted deliberately at each existing leave-aware site (`periodCategories.ts`, `DayTypePicker.tsx`); there is no single combined getter today.
