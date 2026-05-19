Status: ready-for-agent

# #07 Public Holiday Auto-detection

## What to build

Automatically mark public holidays as `PublicHoliday` DayType by fetching them from a public API based on the user's configured Bundesland.

End-to-end slice:
- Settings: Bundesland selector (16 German states)
- On app load (or month navigation): fetch public holidays for the current year from a free API (e.g. `https://feiertage-api.de/api/`)
- Days matching a public holiday are automatically set to `PublicHoliday`
- User can still manually override a day's DayType (e.g. if they worked on a public holiday)
- MSW handler mocks the holiday API in tests

## Acceptance criteria

- [ ] Bundesland can be selected in Settings and persists
- [ ] Public holidays for the configured Bundesland are loaded and shown correctly in the calendar
- [ ] Days auto-classified as PublicHoliday suppress WorkWindow input
- [ ] Manual DayType override is still possible
- [ ] Network request is intercepted by MSW in tests (no real API calls in test suite)
- [ ] Unit/integration tests cover: known holiday date, non-holiday date, API failure (graceful degradation)

## Blocked by

- `#06 DayType Management`
