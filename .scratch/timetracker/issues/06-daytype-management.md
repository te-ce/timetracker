Status: ready-for-agent

# #06 DayType Management

## What to build

Implement DayType classification for each day. DayType determines whether WorkWindows are expected and whether automatic TimeEntry booking occurs.

| DayType | WorkWindow expected? | Auto-booking |
|---|---|---|
| WorkDay | Yes | — |
| Weekend | No | — |
| PublicHoliday | No | — |
| Vacation | No | Sollstunden → On Leave |
| SickDay | No | Sollstunden → On Leave |
| Absence | No | Sollstunden → On Leave |

Rules:
- Weekends (Saturday/Sunday) are automatically classified as `Weekend` — no manual override needed
- All other DayTypes can be set manually by the user on a per-day basis
- For Vacation, SickDay, and Absence: a TimeEntry for `On Leave` equal to `Sollstunden` is automatically created (and removed if the day is reclassified)

End-to-end slice:
- DayType selector in the Tagesdetailansicht (not shown for Weekends)
- Auto-booking logic for leave types
- DayType persisted via `ConfigRepository` / `WorkWindowRepository` → Firestore

## Acceptance criteria

- [ ] Weekends are automatically set to `Weekend` — no selector shown
- [ ] User can set a WorkDay to Vacation, SickDay, Absence, or PublicHoliday
- [ ] Setting Vacation/SickDay/Absence creates an "On Leave" TimeEntry for Sollstunden
- [ ] Reverting to WorkDay removes the auto-generated "On Leave" entry
- [ ] Non-WorkDay days suppress the WorkWindow input
- [ ] DayType persists across page reloads
- [ ] Unit tests: auto-booking for each leave type, reverting, weekend detection

## Blocked by

- `#01 Project Scaffold`
