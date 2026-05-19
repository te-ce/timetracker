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
A time slot on a day during which the user actually worked (start and end time, e.g. 09:00–12:30).  
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
The app automatically derives all sprint boundaries from this configuration.  
The basis for the sprint report.

## ExportStatus
The export state of a sprint with respect to the Excel export.  
- `pending` — not yet exported  
- `exported` — exported manually or automatically; prevents a further automatic export

## WorkLocation
An optional per-day label: `Office` or `Remote`.  
Display/statistics only — no effect on TimeEntries or calculations.

## AutoCategory
The user-chosen category that automatically receives the remaining hours of a day.  
No default — the user must set it explicitly in Settings.  
Calculation: `WorkedHours − Σ manual TimeEntries`. Cannot be negative; undershoot → warning.
