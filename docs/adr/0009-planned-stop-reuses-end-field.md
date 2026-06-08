# ADR 0009: Planned-Stop WorkPeriod Reuses the `end` Field

## Status

Accepted

## Context

To support a planned future stop time on the currently running WorkPeriod, two modelling options were considered:

**Option A — New `plannedEnd?: string` field.** The WorkPeriod stays open (`end: null`), and a separate field carries the declared stop time. Duration logic is unchanged; projections read `plannedEnd`.

**Option B — Reuse `end` for future timestamps.** The existing `end: string | null` field is allowed to hold a future HH:MM string. A WorkPeriod with `end` in the future is classified as a Planned-Stop WorkPeriod and treated as live-tracked until `end` passes.

The trade-off:

|                   | Option A                                | Option B                                                               |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Model change      | Additive (new field)                    | Semantic change to existing field                                      |
| Backwards compat  | Fully safe                              | Past `end` strings already exist; future strings are new               |
| Null meaning      | Preserved (`null` = open)               | Preserved (`null` = open, non-null = stop time whether past or future) |
| Code touch points | Only projection paths need `plannedEnd` | All `end`-reading code must distinguish past vs. future                |
| Data migration    | None                                    | None (HH:MM strings require no format change)                          |
| Storage overhead  | Extra field per period                  | None                                                                   |

Option B was chosen because it keeps the model at one field, avoids a nullable optional that is only meaningful on one day (today), and aligns with the user-facing mental model: "I set a stop time, and that IS the end of the period." The distinction between past and future is purely temporal — the same HH:MM field means "planned stop" before that moment and "actual stop" after.

## Decision

Allow `WorkPeriod.end` to hold an HH:MM string that refers to a future time on today's date.  
The classification is determined at runtime: if the containing day is today and `end` is later than `now`, the period is a **Planned-Stop WorkPeriod** and is treated as live-tracked with a declared stop point.

## Consequences

- ✅ No schema migration — existing persisted data is unaffected.
- ✅ Single field for stop time; no nullable optional that is only meaningful on one day.
- ✅ Natural transition: when `now` crosses `end`, the period silently becomes a normal closed period without any write.
- ❌ All code that reads `end` to determine duration must now explicitly check whether `end` is in the future on today's WorkPeriods before treating it as a fixed duration.
- ❌ The invariant "non-null `end` means the session is over" no longer holds for same-day periods — callers must use the `isPlannedStop(period, date, now)` helper rather than `end !== null` to determine live-tracking status.
