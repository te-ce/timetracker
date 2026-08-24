# ADR 0012: Planned-Stop WorkPeriods Are Not "Live" for the Tracking Bar

## Status

Accepted

## Context

ADR 0009 classifies a WorkPeriod whose `end` is a future HH:MM as a
Planned-Stop WorkPeriod, and states it "is treated as live-tracked until
`end` passes". `findActiveTracking` (`src/features/day/dayStreamModel.ts`)
implemented this literally: it fell back to `findActivePeriod`, which
returns a Planned-Stop WorkPeriod when there is no fully open one.

A future `end` can be written in two ways that are indistinguishable
afterward: pressing "Stop work" with a custom future time in
`TimeNowField`, or editing an open period's times directly and setting its
end to a future value. Either way, the tracking bar (`ActiveTrackingRow`)
stayed visible with "■ Stop work" and "▶ Start subtask" — because the
period still looked "live" by ADR 0009's rule. For the Stop-button case in
particular this reads as a bug: the user just pressed Stop, there is no
open WorkPeriod (`end !== null`), yet the UI still offers to stop tracking.

There is no data-model hook to tell the two paths apart after the fact —
both just leave a WorkPeriod with a future `end`. Fixing the Stop-button
case without also changing the edit-times case is not possible without a
new field (the Option A that ADR 0009 already rejected), so both now
behave the same way.

## Decision

`findActiveTracking` now only treats a fully open WorkPeriod (`end ===
null`) as the currently-tracked session. A Planned-Stop WorkPeriod no
longer counts as active for this purpose. Once any WorkPeriod's `end` is
set — whether by pressing Stop or by editing times to declare a future
end — the tracking bar falls back to `NotTrackingRow`/`LogPastWorkRow`
immediately, even if that end is still in the future.

This only changes what counts as "active tracking" for the bar and for
`DayStats.runningSince`/`lastStop`. It does not touch `isPlannedStop`,
`findPlannedStopPeriod`, `findActivePeriod`, or `derivePlannedStopState` in
`src/shared/worktime.ts` — the countdown-to-planned-stop badge/tray display
and the projected-worked-hours totals (`BalanceRows`, `OvertimeBar`,
`MonthProgressMeter`, `DayTotalsPanel`) still treat a declared future stop
as something to project towards. Those features describe what the rest of
the day is expected to look like; they don't need the Stop/Start-subtask
controls to stay on screen to do that.

## Consequences

- ✅ Pressing Stop, or editing times to declare a future end, ends live
  tracking in the UI, matching the invariant that no open WorkPeriod means
  no "what's running" bar.
- ❌ There is no way, with today's data model, to keep the bar live for "I'm
  still working, planning to leave later" while hiding it for "I already
  stopped, with a future timestamp" — both produce the same `end` value.
  Reintroducing the former would need a separate field (ADR 0009's Option
  A).
- ✅ Countdown and projected-total features (ADR 0009) are unaffected — they
  read `end` directly via `worktime.ts`, not through `findActiveTracking`.
- ❌ ADR 0009's "treated as live-tracked" language no longer holds for the
  tracking bar specifically; it now only describes the projection-facing
  helpers in `worktime.ts`. Readers of ADR 0009 should cross-reference this
  ADR for that narrower scope.
