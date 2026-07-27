# Timetracker — Glossary

## WorkPeriod

A tracked block of time on a day during which the user actually worked.  
Shape: `{ id, start, end: string | null, category: string, subtasks: WorkPeriodSubtask[] }`.  
`start` and `end` are local ISO time strings (e.g. `"09:00"`).  
A day may have multiple WorkPeriods stored in `Day.windows`.  
**WorkedHours** for a day = Σ duration of all WorkPeriods that day.

### Open WorkPeriod

A WorkPeriod with `end: null`. Represents an in-progress work session with no declared stop point.  
Contributes a **live duration** (`now − start`) to WorkedHours, updated on a 1-minute tick.  
Excluded from duration calculations when `now` is unavailable.  
At most one open WorkPeriod per day is expected; if multiple exist, the one with the **latest start** is treated as the current session.

### Planned-Stop WorkPeriod

A WorkPeriod whose `end` is an HH:MM string referring to a time still in the future on the same day.  
Represents an in-progress session where the user has declared in advance when they intend to stop.  
Contributes a **live duration** (`now − start`) to WorkedHours, exactly like an Open WorkPeriod.  
Contributes its **full planned duration** (`end − start`) to **projected** overtime/undertime calculations.  
When `now` crosses `end`, the period transitions automatically to a closed, fixed-duration WorkPeriod — no explicit user action is required.  
Only the currently running WorkPeriod may carry a future `end`; fully-future periods (start also in the future) are not supported.

### WorkPeriod–Category Tracking link

Starting category tracking automatically opens a WorkPeriod for that day at the current local time — unless an open WorkPeriod already exists for that day (same continuous session, different category).  
Stopping tracking closes the latest open WorkPeriod by setting `end` to the current local time.

## WorkPeriodSubtask

A carve-out of hours within a WorkPeriod under a different category.  
Shape: `{ id, category, hours, startedAt?: string, stoppedAt?: string, note?: string }`.  
The **base period category** gets the remainder: `periodDuration − Σ subtask hours`.  
`startedAt`/`stoppedAt` are optional wall-clock timestamps for live subtask tracking.  
Subtasks are displayed and edited inside the WorkPeriod dialog in DayView.

## TimeEntry

An aggregated `{ id, category, hours }` record produced by `findEntriesByDateRange`.  
Used for sprint report derivation — not a primary editing unit.  
Category hours are derived from WorkPeriods via `calculateCategoryHours()`, not stored directly.

## WorkedHours

Σ duration of all WorkPeriods for a day (in decimal hours).  
Closed WorkPeriods (past `end`) contribute their fixed `end − start` duration.  
Open WorkPeriods (`end: null`) contribute a live `now − start` duration (updated every minute in DayView).  
Planned-Stop WorkPeriods (`end` in the future) also contribute a live `now − start` duration — identical to open periods, until `end` passes and they become closed.  
Distinct from **Sollstunden** (the configured daily target).

## ProjectedWorkedHours

The anticipated WorkedHours for today assuming the user works until every planned stop.  
= WorkedHours (closed + live) + planned remaining (`end − now`) for each Planned-Stop WorkPeriod.  
Used by the overtime badge and OvertimeBar to show a projected end-of-day balance rather than the current live balance.  
Distinct from WorkedHours, which only counts time already elapsed.

## UNCATEGORIZED_CATEGORY

The sentinel string `'_UNCATEGORIZED'` assigned to WorkPeriod remainder hours when the period carries no meaningful category.  
Hours attributed to `_UNCATEGORIZED` are treated as **unaccounted** — the day is not considered balanced.  
Shown as a warning in reports; does not block export.

## Sollstunden

Configured daily working-hours target. Used for the hours overview and monthly statistics.

## Restarbeitszeit

`Sollstunden − WorkedHours` for a day.  
Displayed once at least one WorkPeriod has been recorded.  
Positive = hours still missing. Negative = overtime.

When a Planned-Stop WorkPeriod is active, the overtime badge and OvertimeBar switch to a **projected** mode:

- **Badge / tab title**: shows time remaining until the planned stop (`end − now`) rather than remaining target hours.
- **OvertimeBar**: shows the projected overtime/undertime at the planned stop (`ProjectedWorkedHours − Sollstunden`), with a visual indicator that this is a projection.

The `remainingTimeReference` setting (Settings page) controls the badge and tab-title display:

- `'planned-stop'` (default when a Planned-Stop WorkPeriod exists) — show countdown to `end`.
- `'target-hours'` — always show `Sollstunden − WorkedHours`, ignoring any planned stop.

## DayType

Classification of a day. Determines whether WorkPeriods are expected and whether automatic bookings occur.

| DayType         | WorkPeriod expected? | Auto-booking           |
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
Display/statistics only — no effect on WorkPeriods or category hours.

## AutoCategory

The **global default category** pre-filled when a new WorkPeriod is created.  
Set in Settings (`AppConfig.autoCategory`); can be overridden per day via `Day.autoCategoryOverride`.  
`resolveAutoCategory(date, dayOverrides, globalDefault)` returns the effective category for a given day.  
No longer absorbs remaining hours automatically — day balance is determined by `UNCATEGORIZED_CATEGORY` hours, not by AutoCategory.  
Accepts both fixed categories and dynamic categories.

## DynamicCategory

A user-defined or investment-sourced category beyond the 10 fixed ones.  
Stored as `customCategories: string[]` in AppConfig.  
Usable as a WorkPeriod category, subtask category, or AutoCategory default.  
Investment categories are loaded from Excel via Graph API during mapping setup.

## MonthGrid

A spreadsheet-like view for one month. Rows = days (1–31), columns = all categories.  
Each cell shows hours derived from `calculateCategoryHours()` across all WorkPeriods for that day.  
Clicking a category cell opens the **WorkPeriod dialog** in DayView for editing.  
A read-only **WorkedHours** column provides context.

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

The display and action status of a single day. Derived from DayType, WorkedHours, category hours, and confirmation state.

| Status         | Meaning                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| `non-working`  | Weekend or PublicHoliday — no work expected                                       |
| `leave`        | Vacation, SickDay, or Absence — day off                                           |
| `future`       | Future WorkDay with no hours logged yet                                           |
| `today`        | Today — display modifier layered on top of actual work status                     |
| `complete`     | Past WorkDay that needs no action: confirmed or balanced (no uncategorized hours) |
| `needs-review` | Past or current WorkDay with uncategorized hours or other imbalance               |
| `untracked`    | Past WorkDay with zero WorkedHours and no categorized hours                       |

**`needs-review`** arises when `UNCATEGORIZED_CATEGORY` hours > 0.01 h, or categorized hours > WorkedHours, or categorized hours > 0 but WorkedHours = 0.

**`complete`** when confirmed by the user, or when `uncategorizedHours < 0.01` (all WorkPeriod time is attributed to real categories).

**`today`** is not a standalone status — always resolved to its underlying work status for dot colors and reason text, prefixed with "Today —".

## DaySummary

The computed state of a single day within a month. Combines raw data (WorkPeriods, DayType overrides) into a single summary:

- **dayType**: resolved DayType (override > classifyDay)
- **workedHours**: Σ WorkPeriod durations
- **entryTotal**: Σ categorized hours (excluding `_UNCATEGORIZED`)
- **isEntriesBalanced**: `workedHours > 0 && uncategorizedHours < 0.01`
- **displayStatus**: the DayStatus resolved for display — `today` is collapsed to its underlying work status
- **statusReason**: human-readable explanation (e.g. "Balanced", "Unaccounted: 1.5 h")

Built via `buildMonthSummaries(year, month, input)` which returns all DaySummaries for a month plus aggregate stats (workDayCount, workedHoursPerDay, hasAnyTrackedHours).

## WorkbookService

Interface abstracting read/write access to the Excel sprint template. Two adapters:

- **GraphApiWorkbookService** — reads/writes via Microsoft Graph API (SharePoint-hosted workbook)
- **LocalFolderWorkbookService** — reads/writes a local `.xlsx` file via the File System Access API and the `xlsx` library

Both implement:

- `listSheets()` — worksheet names
- `listRows(sheet)` — task rows (Task ID + description) for mapping configuration
- `writeSprintData(sheet, mapping, hoursPerCategory)` — write sprint totals to the template

Components and views use the interface; which adapter is active depends on whether the user is in cloud mode or local folder mode.

## QUERY_KEYS

Centralized registry of all TanStack Query cache keys. Lives in `src/shared/queryKeys.ts`. All `useQuery` and invalidation calls must use these factory functions — never inline arrays.

Examples:

- `QUERY_KEYS.config` — app config
- `QUERY_KEYS.month(year, month)` — all WorkPeriods for a month
- `QUERY_KEYS.monthAll` — invalidates all month queries
- `QUERY_KEYS.activeTracking` — currently open tracking session
- `QUERY_KEYS.sprintEntries(index, startDate, lengthDays)` — aggregated sprint TimeEntry records
- `QUERY_KEYS.sprintExportByIndex(index)` — export status for a sprint
