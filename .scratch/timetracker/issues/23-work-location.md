Status: ready-for-agent

# #23 WorkLocation per-day model + DayView UI

## What to build

Add a per-day `WorkLocation` label (`Office` | `Remote` | `null`) that the user can toggle from DayView. The value is display/statistics only — no effect on TimeEntries or calculations. Store in a repository, show in DayView as a toggle, and display as an indicator in MonthGrid rows.

## Acceptance criteria

- [ ] `WorkLocation` type defined (`Office` | `Remote`)
- [ ] Repository interface with save/find for work location per date
- [ ] In-memory implementation with tests
- [ ] DayView shows toggle to set Office/Remote for the selected day
- [ ] MonthGrid rows display a location indicator when set
- [ ] Setting location does not affect any hour calculations

## Blocked by

None - can start immediately
