Status: ready-for-agent

# #15 DayOverride model + per-day AutoCategory

## What to build

Introduce a `DayOverride` persistence model that allows per-day override of which category receives auto-filled hours. The global default from `AppConfig.autoCategory` applies unless a per-day override exists.

End-to-end: DayView shows a dropdown on the AutoCategoryRow to pick a different category for that day → stored as DayOverride → calculation uses the override category instead of global default.

## Acceptance criteria

- [ ] `DayOverride` type defined: `{ date: string, autoCategory?: string }`
- [ ] `DayOverrideRepository` interface + in-memory implementation
- [ ] DayView AutoCategoryRow shows a category selector (click to change)
- [ ] When override is set, AutoCategory computation uses the override category
- [ ] When override is cleared (set to null), reverts to global default
- [ ] Unit tests: override takes precedence, clearing reverts
- [ ] Component tests: selector visible, changes category label

## Blocked by

- #14 DynamicCategory support (AutoCategory selector must include dynamic categories)
