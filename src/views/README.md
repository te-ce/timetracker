# src/views

Route-level components. Each view wires repositories, hooks, and mutations together — no domain logic that belongs in `src/domain/`.

## Routes

| View | Route | Search params |
|---|---|---|
| `MonthView` | `/` | `year`, `month` (both optional, default to current) |
| `MonthGridView` | `/grid` | — |
| `DayView` | `/day` | `date: YYYY-MM-DD` |
| `SprintView` | `/sprint` | — |
| `SettingsView` | `/settings` | — |

Routes are registered in `src/main.tsx`.

## Views

### `MonthView`

Calendar overview. Renders `MonthCalendar` with colour-coded day statuses from `useMonthQuery`. Clicking a day navigates to `/day`. Month navigation updates the `year`/`month` search params. Includes a "Reset all" button (month-wide data deletion with confirmation).

### `MonthGridView`

Spreadsheet view. Renders `MonthGrid` with all categories as columns and days as rows. Manages category rename, reorder, and auto-category mutations. Includes "Reset all" with confirmation.

### `DayView`

Detailed day view. Composes `WorkPeriodPanel`, `TimeEntryPanel`, `OvertimeBar`, and `DayTypePicker`. Manages confirm/unconfirm, work location toggle, and day reset. All data comes from `useDayQuery(selectedDate)`.

### `SprintView`

Sprint export view. Picks the correct `WorkbookService` implementation (Graph API or local folder) based on config. Renders `SprintConfigPanel` and `SprintReportPanel`. Handles the export mutation.

### `SettingsView`

Assembles all `*Settings` components. Cloud-only sections (`CloudSyncSettings`, `SharePointSettings`, `SheetSelector`) are hidden in local folder mode; `LocalExcelFolderSettings` and `LocalExcelSettings` are shown instead.

## Reset pattern

`MonthView` and `MonthGridView` share identical reset logic: fetch all data for the month in parallel, then delete everything in a second `Promise.all`, then call `queryClient.invalidateQueries()` (full cache invalidation). `DayView` does the same for a single day.
