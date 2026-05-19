Status: ready-for-agent

# #20 AutoFillRule domain + materialization

## What to build

Domain model and pure logic for auto-fill rules. A rule defines a recurring TimeEntry pattern that materializes real entries. Two recurrence types: `everyWorkday` and `weekly(days, intervalWeeks)`. Rules skip non-WorkDay days. Each rule tracks `materializedDates` to prevent re-creation after user deletion.

Core function: `materializeRules(rules, fromDate, toDate, isWorkDay) → TimeEntry[]` — returns entries to create.

## Acceptance criteria

- [ ] `AutoFillRule` type: `{ id, category, hours, pattern, label?, materializedDates: Set<string> }`
- [ ] `RecurrencePattern` type: `{ type: 'everyWorkday' } | { type: 'weekly', days: DayOfWeek[], intervalWeeks: number, anchorDate: string }`
- [ ] `materializeRules` pure function produces correct entries for date range
- [ ] `everyWorkday` pattern fires Mon–Fri, skips non-WorkDays
- [ ] `weekly` pattern fires on specified days at correct interval, skips non-WorkDays
- [ ] Already-materialized dates (in `materializedDates`) are skipped
- [ ] `AutoFillRuleRepository` interface + in-memory implementation
- [ ] Unit tests: both patterns, skip logic, materializedDates dedup, edge cases (month boundary, holiday skip)

## Blocked by

None - can start immediately
