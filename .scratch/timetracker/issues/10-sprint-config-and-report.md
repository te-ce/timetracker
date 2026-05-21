Status: ready-for-agent

# #10 Sprint Configuration + Sprint Report

## What to build

Implement Sprint management: configure a sprint cadence once and let the app calculate all boundaries automatically. Show a per-sprint summary of tracked hours per category.

Sprint config (Settings):

- Sprint length in weeks (e.g. 2)
- Sprint start date (one-time, then auto-calculated forward)

Sprint report screen:

- Select a sprint (current or past)
- Σ TimeEntry hours per category for the sprint period
- ExportStatus badge: `pending` / `exported`

ExportStatus:

- Starts as `pending`
- Set to `exported` by the manual export flow (slice #12)
- `exported` sprint is not re-exported automatically

## Acceptance criteria

- [ ] Sprint length and start date are configurable in Settings
- [ ] App correctly derives all sprint boundaries from config (past and future)
- [ ] Sprint report shows Σ hours per category for the selected sprint
- [ ] ExportStatus (`pending` / `exported`) is visible on the report
- [ ] Sprint config persists across page reloads
- [ ] Unit tests: sprint boundary calculation, Σ aggregation, ExportStatus transitions

## Blocked by

- `#04 TimeEntry Booking`
