Status: ready-for-agent

# #08 Month Calendar View + Day Navigation + Incomplete-day Banner

## What to build

Implement the primary app view: a month calendar. Each day is colour-coded by DayType. Tapping a day opens the Tagesdetailansicht. An in-app banner warns about past incomplete WorkDays.

A day is **complete** when:

- It is not a WorkDay (Weekend, PublicHoliday, Vacation, etc.) — automatically complete, **or**
- At least one WorkWindow has been recorded (AutoCategory covers the rest)

End-to-end slice:

- Month calendar grid, navigable by month
- Each day cell shows: date, DayType colour, WorkedHours summary if any WorkWindows exist
- Click/tap opens the Tagesdetailansicht (built in slices #03, #04, #05, #06)
- In-app banner: "X days need attention" — lists past WorkDays without a WorkWindow or with no TimeEntries at all; tapping a day in the banner navigates to it
- No push notification opt-in required

## Acceptance criteria

- [ ] Month calendar renders all days of the selected month
- [ ] Each day is colour-coded by DayType
- [ ] Month navigation (previous / next) works
- [ ] Clicking a day opens the Tagesdetailansicht
- [ ] Banner appears when past incomplete WorkDays exist; hidden otherwise
- [ ] Banner lists the affected days and navigates to them on click
- [ ] RTL tests cover: complete day hides banner entry, incomplete day shows it, non-WorkDay is always complete

## Blocked by

- `#03 WorkWindow, WorkedHours & Restarbeitszeit`
- `#04 TimeEntry Booking`
- `#06 DayType Management`
