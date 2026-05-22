# Timetracker — Glossary

## TimeEntry

A booking of hours against a category for a specific day.  
Consists of: **date**, **category**, **duration (decimal hours, e.g. `1.5`)**.  
Contains no start or end time — only a duration.

## WorkedHours

Σ duration of all WorkWindows for a day (in decimal hours).  
Closed WorkWindows contribute their fixed `end − start` duration.  
Open WorkWindows contribute a live `now − start` duration (updated every minute in DayView).  
Serves as the basis for the AutoCategory: `Auto = WorkedHours − Σ manual TimeEntries`.  
Distinct from **Sollstunden** (the configured daily target).

## Sollstunden

Configured daily working-hours target. Used for the hours overview and monthly statistics — not directly for the AutoCategory.

## WorkWindow

A duration block on a day during which the user actually worked.  
Can be entered as a **start/end time pair** (e.g. 09:00–12:30) from DayView, or as a **plain duration** (decimal hours, e.g. `3.5`) from the MonthGrid WorkedHours column.  
A day may have multiple WorkWindows.  
**WorkedHours** for a day = Σ duration of all WorkWindows that day.

### Open WorkWindow

A WorkWindow with a start time but no end (`end: null`). Represents an in-progress work session.  
Contributes a **live duration** (`now − start`) to WorkedHours, updated on a 1-minute tick.  
Excluded from duration calculations when `now` is unavailable (e.g. server-side or batch contexts).  
At most one open WorkWindow per day is expected; if multiple exist, the one with the **latest start** is treated as the current session.

### WorkWindow–Category Tracking link

Starting category tracking (pressing **Start** on a TimeEntry category) automatically opens a WorkWindow for that day at the current local time — unless an open WorkWindow already exists for that day (same continuous session, different category).  
Stopping category tracking (pressing **Stop**) closes the latest open WorkWindow for that day by setting its end to the current local time.

## Restarbeitszeit

`Sollstunden − WorkedHours` for a day.  
Displayed once at least one WorkWindow has been recorded.  
Positive = hours still missing. Negative = overtime.

## DayType

Classification of a day. Determines whether WorkWindows are expected and whether automatic bookings occur.

| DayType         | WorkWindow expected? | Auto-booking           |
| --------------- | -------------------- | ---------------------- |
| `WorkDay`       | Yes                  | —                      |
| `Weekend`       | No                   | —                      |
| `PublicHoliday` | No                   | —                      |
| `Vacation`      | No                   | Sollstunden → On Leave |
| `SickDay`       | No                   | Sollstunden → On Leave |
| `Absence`       | No                   | Sollstunden → On Leave |

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

## AutoCategory Override

- Per-day override for AutoCategory is supported via `resolveAutoCategory()` function
- Override takes precedence over global default setting
- When cleared, reverts to the computed value from `calculateAutoCategory()`
- Used in DayView and MonthGrid for per-day configuration

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

## BootstrapConfig

The minimal configuration required to initialize MSAL before the app can function.  
Contains: **`clientId`** (Azure AD Application ID) and **`tenantId`** (Azure AD Directory ID).  
Stored in `localStorage` under a dedicated key — never synced to OneDrive.  
Must be available before MSAL initialization; therefore it cannot live in `AppConfig`.  
When absent, the app runs in **local-only mode** with all Microsoft features disabled.

## SyncMode

The persistence mode the app is currently operating in.

- `offline` — no Microsoft account active; all data is stored in browser localStorage only. Data does not leave the device.
- `synced` — a Microsoft account is authenticated; all data is read from and written to the OneDrive App Folder, with localStorage as an offline fallback cache.

The app is fully functional in either mode. Switching from `offline` to `synced` happens when the user signs in via Settings; the first write after sign-in uploads any locally-held data to OneDrive.

## ExcelMapping

The configured association between an app category and an Excel row in the SharePoint workbook.  
Stored as a `Record<string, string>` in AppConfig (`categoryMapping`): category key → Excel Task ID.  
At export time, each mapped category's sprint hours are written to the row identified by that Task ID.  
Unmapped categories are silently skipped.

## TargetSheet

The Excel worksheet tab selected by the user as the destination for sprint data.  
Stored in AppConfig as `targetSheet: string | null`.  
Populated by reading the workbook's sheet names via Graph API and letting the user select one.  
One sheet is active at a time; the user updates it in Settings when the sprint sheet changes (e.g. at sprint start).

## SharePointWorkbook

The Excel file in SharePoint identified by its SharePoint URL, entered once in Settings (`sharepointUrl`).  
Accessed via Microsoft Graph API using the `/shares/{encodedUrl}/driveItem` endpoint.  
Holds the time-tracking template: fixed category rows + investment rows.  
The source for investment row discovery (→ DynamicCategory) and the write target for ExcelMapping export.

## DayStatus

The display and action status of a single day. Derived from DayType, WorkedHours, TimeEntries, and confirmation state.

| Status | Meaning |
|---|---|
| `non-working` | Weekend or PublicHoliday — no work expected |
| `leave` | Vacation, SickDay, or Absence — day off |
| `future` | Future WorkDay with no hours logged yet |
| `today` | Today — display modifier layered on top of actual work status |
| `complete` | Past WorkDay that needs no action: confirmed, balanced, or AutoCategory covers the gap |
| `needs-review` | Past or current WorkDay where hours don't add up and user attention is needed |
| `untracked` | Past WorkDay with zero WorkedHours **and** zero TimeEntries |

**`needs-review`** arises from three distinct causes:
- **Under-categorized**: WorkedHours > Σ TimeEntries and no AutoCategory set
- **Over-categorized**: Σ TimeEntries > WorkedHours
- **Entries without work time**: Σ TimeEntries > 0 but WorkedHours = 0

**`complete`** has multiple sub-causes, all visible in the status reason:
- Explicitly confirmed by the user (confirmation overlays the balance state — misalignment is still shown)
- Balanced: Σ TimeEntries ≈ WorkedHours (within 0.01 h)
- AutoCategory absorbs the remaining gap

**`today`** is not a standalone status — always resolved to its underlying work status for dot colors and reason text, prefixed with "Today —".

## DaySummary

The computed state of a single day within a month. Combines raw data (WorkWindows, TimeEntries, DayType overrides) into a single summary:

- **dayType**: resolved DayType (override > classifyDay)
- **workedHours**: Σ WorkWindow durations
- **entryTotal**: Σ TimeEntry hours
- **isEntriesBalanced**: whether entryTotal ≈ workedHours (within 0.01 h)
- **hasAutoCategory**: whether an AutoCategory is set and absorbs the remaining gap
- **dayStatus**: the DayStatus for this day

Built via `buildMonthSummaries(year, month, input)` which returns all DaySummaries for a month plus aggregate stats (workDayCount, workedHoursPerDay, hasAnyTrackedHours).
