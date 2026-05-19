Status: ready-for-agent

# #05 AutoCategory

## What to build

Implement the AutoCategory feature: exactly one category (chosen by the user in Settings) automatically receives the remaining hours of a day after all manual TimeEntries are accounted for.

Calculation: `AutoCategory hours = WorkedHours − Σ manual TimeEntries`

Rules:
- No default AutoCategory — the user must explicitly configure it in Settings
- If no AutoCategory is configured, the feature is dormant
- If manual entries exceed WorkedHours, AutoCategory hours floor at 0 and the day row is **visually flagged as overbooking warning**
- AutoCategory is visually distinguished from manual categories in the day view

End-to-end slice:
- Settings screen: dropdown/selector to pick AutoCategory from the 10 fixed categories
- Day view: AutoCategory row shows calculated hours (not editable directly)
- Overbooking warning is shown when `Σ manual TimeEntries > WorkedHours`
- Config persisted via `ConfigRepository` → Firestore

## Acceptance criteria

- [ ] User can set AutoCategory in Settings (any of the 10 fixed categories)
- [ ] AutoCategory row in day view is read-only and visually marked as auto
- [ ] AutoCategory hours update reactively when WorkedHours or manual TimeEntries change
- [ ] When overbooking: AutoCategory shows 0 and a red warning is visible
- [ ] AutoCategory is dormant (not shown) if not configured
- [ ] Config persists across page reloads
- [ ] Unit tests: normal case, overbooking, exactly equal, no WorkWindows yet

## Blocked by

- `#03 WorkWindow, WorkedHours & Restarbeitszeit`
- `#04 TimeEntry Booking`
