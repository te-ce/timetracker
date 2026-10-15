# ADR 0013: WorkPeriods never cross midnight

## Status

Accepted

## Context

`start` and `end` are bare HH:MM strings stored under one date. `elapsedHours` wrapped a negative difference past midnight, so `22:00–02:00` counted 4h. Nothing else agreed with that:

- The segment stream (`deriveSegments`) produced no segment for such a period, so its hours vanished from the category totals while WorkedHours kept them.
- On the day itself the balance credited the whole wrapped span before it had happened.
- No input lets a user deliberately enter a period past midnight, and the next day can't see it. In practice every wrapped period was a typo — e.g. Stop with a custom time before the start silently became a 23h period.

## Decision

A WorkPeriod (and a timed subtask) lies within one day and ends strictly after it starts.

- `elapsedHours(start, end)` is `max(0, end − start)`: no wrap. This also covers the minute-tick race that the old `raceToleranceMinutes` option handled.
- Inputs reject `end <= start` with a message: the period time editor, "Log work" on a past day, and the tracking bar's hand-picked stop/subtask time.
- Work past midnight is two periods: one ending at 23:59 and one on the next day starting 00:00.

## Consequences

- ✅ WorkedHours, segment/category totals and the day balance agree for every stored period.
- ✅ A mistyped stop time can no longer turn into ~23h.
- ❌ A period already stored with `end < start` now counts 0h instead of the wrapped span.
- `addHoursToTime` (ETA) and `elapsedHoursSince` (live display) still wrap; they describe wall-clock time, not stored periods.
