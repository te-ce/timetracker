Status: ready-for-agent

# #24 Overtime carry-over onboarding + monthly display

## What to build

Wire the existing `calculateOvertimeCarryOver` domain function into the app. Add `initialOvertime` and `overtimeManualOverrides` fields to AppConfig. Display the cumulated carry-over in MonthStatsPanel. Provide a Settings field for the onboarding starting value and a per-month correction input in the monthly stats view.

## Acceptance criteria

- [ ] `AppConfig` extended with `initialOvertime: number` and `overtimeManualOverrides: Record<string, number>`
- [ ] MonthStatsPanel shows cumulated overtime carry-over for the displayed month
- [ ] Settings view has input for initial overtime value (onboarding)
- [ ] Monthly stats view allows manual correction of carry-over for current month
- [ ] Carry-over calculation chains correctly across months (uses existing domain fn)
- [ ] In-memory config repository updated with new fields

## Blocked by

None - can start immediately
