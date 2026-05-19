# Timetracker — Glossary

## TimeEntry
A booking of hours against a category for a specific day.  
Consists of: **date**, **category**, **duration (decimal hours, e.g. `1.5`)**.  
Contains no start or end time — only a duration.

## WorkedHours
Σ duration of all WorkWindows for a day (in decimal hours).  
Serves as the basis for the AutoCategory: `Auto = WorkedHours − Σ manual TimeEntries`.  
Distinct from **Sollstunden** (the configured daily target).

## Sollstunden
Configured daily working-hours target. Used for the hours overview and monthly statistics — not directly for the AutoCategory.

## WorkWindow
A duration block on a day during which the user actually worked.  
Can be entered as a **start/end time pair** (e.g. 09:00–12:30) from DayView, or as a **plain duration** (decimal hours, e.g. `3.5`) from the MonthGrid WorkedHours column.  
A day may have multiple WorkWindows.  
**WorkedHours** for a day = Σ duration of all WorkWindows that day.

## Restarbeitszeit
`Sollstunden − WorkedHours` for a day.  
Displayed once at least one WorkWindow has been recorded.  
Positive = hours still missing. Negative = overtime.

## DayType
Classification of a day. Determines whether WorkWindows are expected and whether automatic bookings occur.

| DayType | WorkWindow expected? | Auto-booking |
|---|---|---|
| `WorkDay` | Yes | — |
| `Weekend` | No | — |
| `PublicHoliday` | No | — |
| `Vacation` | No | Sollstunden → On Leave |
| `SickDay` | No | Sollstunden → On Leave |
| `Absence` | No | Sollstunden → On Leave |

## Sprint
A configured recurring period with a fixed length (e.g. 2 weeks) and a one-time start date.  
Configured in Settings as: **`sprintStartDate`** (ISO date of the first sprint's start) + **`sprintDurationWeeks`** (integer, e.g. `2`).  
The app automatically derives all past and future sprint boundaries from these two values.  
The basis for the sprint report.

## ExportStatus
The export state of a sprint with respect to the Excel export.  
- `pending` — not yet exported  
- `exported` — exported manually or automatically; prevents a further automatic export

## WorkLocation
An optional per-day label: `Office` or `Remote`.  
Display/statistics only — no effect on TimeEntries or calculations.

## AutoCategory
The category that automatically receives the remaining hours of a day.  
A **global default** is set in Settings; can be **overridden per day** from DayView or MonthGrid.  
Calculation: `WorkedHours − Σ manual TimeEntries`. Cannot be negative; floors at 0.  
The user may also manually override the auto-computed value. Clearing the override reverts to the computed value.  
When `Σ all entries (including auto) < WorkedHours`, the day is flagged as having **unaccounted hours**.  
Accepts both fixed categories and dynamic categories.

## DynamicCategory
A user-defined or investment-sourced category beyond the 10 fixed ones.  
Stored as `customCategories: string[]` in AppConfig.  
Usable for TimeEntries and as AutoCategory target.  
Investment categories are loaded from Excel via Graph API during mapping setup.

## MonthGrid
A spreadsheet-like view for one month. Rows = days (1–31), columns = all categories.  
Each cell shows booked hours and is editable inline.  
A read-only **WorkedHours** column provides context.  
The AutoCategory column shows computed values (greyed out) but accepts manual overrides.

## AutoFillRule
A recurring rule that materializes real TimeEntries on app load.  
Two recurrence patterns:
- `everyWorkday` — fires Mon–Fri, skips non-WorkDay days (holidays, vacation, etc.)
- `weekly(days, intervalWeeks)` — specific weekday(s) every N weeks, also skips non-WorkDay days

Each rule tracks a `materializedDates` set (ISO strings) — days where the rule was already applied.  
If a date is in the set, the rule does not re-create the entry (even if the user deleted it).  
Materialization happens on app load: scan from last materialization date to today.

## DaySummary
The computed state of a single day within a month. Combines raw data (WorkWindows, TimeEntries, DayType overrides) into a single summary:
- **dayType**: resolved DayType (override > classifyDay)
- **workedHours**: Σ WorkWindow durations
- **entryTotal**: Σ TimeEntry hours
- **isEntriesBalanced**: whether entryTotal ≈ workedHours (within 0.01)
- **dayStatus**: the display status for the MonthCalendar (non-working, future, today, tracked, incomplete, needs-attention, and compound today variants)

Built via `buildMonthSummaries(year, month, input)` which returns all DaySummaries for a month plus aggregate stats (workDayCount, workedHoursPerDay, hasAnyTrackedHours).
