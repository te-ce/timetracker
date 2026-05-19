Status: ready-for-agent

# #22 AutoFillRule app-load trigger

## What to build

On app startup, invoke the materialization engine for all configured rules. Scan from the last materialization date to today. Create TimeEntries for matching days. Update each rule's `materializedDates` set. Persist both the new entries and the updated rules.

## Acceptance criteria

- [ ] On app load (e.g. in a top-level useEffect or provider), materialization runs
- [ ] Scans from last materialization date (stored in AppConfig or per-rule) to today
- [ ] Created entries are normal TimeEntries (appear in DayView, MonthGrid, etc.)
- [ ] `materializedDates` updated for each rule after successful creation
- [ ] Non-WorkDay days skipped (requires DayType classification including holidays)
- [ ] Integration test: app loads → rules produce entries → entries visible in queries
- [ ] Idempotent: running twice on same day produces no duplicates

## Blocked by

- #20 AutoFillRule domain + materialization
