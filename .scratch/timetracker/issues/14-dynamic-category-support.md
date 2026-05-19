Status: ready-for-agent

# #14 DynamicCategory support

## What to build

Add support for user-defined categories beyond the 10 fixed ones. The user can manage a `customCategories` list in Settings. These dynamic categories appear alongside fixed categories in all booking UIs (DayView TimeEntryPanel, MonthGrid, AutoCategory selector).

End-to-end: Settings UI to add/remove custom categories → persisted in AppConfig → available as booking targets in TimeEntryPanel and AutoCategory selectors.

## Acceptance criteria

- [ ] `AppConfig` gains `customCategories: string[]` field
- [ ] Settings UI allows adding and removing custom categories (free-text input + list)
- [ ] TimeEntryPanel shows fixed + dynamic categories as bookable rows
- [ ] AutoCategory selector (global + per-day) includes dynamic categories
- [ ] Category type is widened so TimeEntry accepts dynamic category strings
- [ ] Unit tests: adding/removing custom categories persists correctly
- [ ] Component tests: dynamic categories render in TimeEntryPanel

## Blocked by

None - can start immediately
