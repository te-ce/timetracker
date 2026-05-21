Status: ready-for-agent

# #09 Month Statistics

## What to build

Implement the Monatsübersicht screen showing aggregated statistics for the selected month.

Displayed metrics:

- **Gesamtstunden** — Σ WorkedHours for all WorkDays in the month
- **Überstunden** — Σ WorkedHours − Σ Sollstunden for all WorkDays in the month
- **Erfüllungsgrad** — `(Σ WorkedHours / Σ Sollstunden) × 100 %`
- **Überstunden-Übertrag** — cumulative carry-over: user enters a one-time starting balance at onboarding; the app accumulates it month-by-month; the user can manually correct the value for any month

Settings: configurable Tages-Sollstunden (daily target hours).

## Acceptance criteria

- [ ] Monatsübersicht screen is accessible from main navigation
- [ ] Gesamtstunden, Überstunden, and Erfüllungsgrad are calculated and displayed correctly
- [ ] Tages-Sollstunden is configurable in Settings and used in all calculations
- [ ] Überstunden-Übertrag: initial value can be entered at onboarding/settings
- [ ] Überstunden-Übertrag auto-cumulates from the previous month's balance
- [ ] Überstunden-Übertrag can be manually corrected per month
- [ ] All values survive page reload (Firestore persistence)
- [ ] Unit tests: Gesamtstunden, Überstunden, Erfüllungsgrad, carry-over accumulation

## Blocked by

- `#03 WorkWindow, WorkedHours & Restarbeitszeit`
- `#04 TimeEntry Booking`
