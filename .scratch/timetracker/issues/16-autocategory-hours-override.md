Status: ready-for-agent

# #16 AutoCategory hours override

## What to build

Allow the user to manually override the auto-computed hours value for the AutoCategory on a specific day. The AutoCategory cell shows the computed value (greyed out) by default. If the user types a manual value, it's stored as an override. Clearing the input reverts to the computed value. When total entries don't account for all WorkedHours, display an "unaccounted hours" visual flag.

## Acceptance criteria

- [ ] `DayOverride` gains optional `autoCategoryHoursOverride?: number` field
- [ ] AutoCategoryRow in DayView shows an editable input (pre-filled with computed, greyed)
- [ ] Typing a value stores it as override; the cell un-greys
- [ ] Clearing the value reverts to computed (greyed again)
- [ ] `calculateAutoCategory` accepts an optional override parameter
- [ ] Visual flag shown when `WorkedHours − Σ all entries (including auto) > 0` (unaccounted hours)
- [ ] Unit tests: override param used when present, unaccounted detection
- [ ] Component tests: edit/clear/flag behaviour

## Blocked by

- #15 DayOverride model + per-day AutoCategory
