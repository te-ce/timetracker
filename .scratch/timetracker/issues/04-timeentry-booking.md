Status: ready-for-agent

# #04 TimeEntry Booking (Manual Categories)

## What to build

Implement manual TimeEntry booking against the 10 fixed categories for a given day. A TimeEntry is a (date, category, duration in decimal hours) tuple — no start/end time.

Fixed categories (in order):
1. On Leave
2. Training, Events
3. Coremedia
4. QA
5. Support
6. CoPs
7. Bug/Maintenance
8. Infra
9. Architecture
10. Testwatch

End-to-end slice:
- Display all 10 categories in the Tagesdetailansicht with their current booked hours (0 if none)
- User can enter/update hours for any category
- List of all TimeEntries for the day is shown
- Persist via `TimeEntryRepository` → Firestore implementation

## Acceptance criteria

- [ ] All 10 fixed categories are visible in the day view
- [ ] User can book decimal hours (e.g. `1.5`) against any category
- [ ] Existing booking for a category can be updated
- [ ] A booking of 0 hours removes the TimeEntry (or shows as empty)
- [ ] Bookings survive a page reload (Firestore persistence)
- [ ] Unit tests cover: booking, updating, and removing a TimeEntry; Σ hours calculation

## Blocked by

- `#01 Project Scaffold`
