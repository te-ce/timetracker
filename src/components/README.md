# src/components

Presentational and container components. No route logic, no singleton repository access (except settings panels which need `configRepo` by convention).

## Patterns

### Repo-as-prop

`TimeEntryPanel`, `WorkPeriodPanel`, `WorkedHoursCell`, `DayTypePicker`, and all settings components receive their repositories as props. This is what makes tests work without mocking — inject an in-memory repo.

### Portal modals

`ConfirmDialog`, `KeyboardShortcutLegend`, and `WorkedHoursCell`'s dialog use `createPortal(…, document.body)`. They register their own `keydown` / `mousedown` listeners for Escape and outside-click dismissal.

### Settings panels

All `*Settings.tsx` files accept `repository: ConfigRepository` and use `useMutation` to save config. They are collected in `src/views/SettingsView.tsx`.

## Component index

| Component | Purpose |
|---|---|
| `AutoCategoryPicker` | Inline dropdown to select the auto-fill category |
| `AutoCategoryRow` | Grid row displaying auto-category hours |
| `AutoCategorySettings` | Settings panel: global auto-fill category |
| `BundeslandSettings` | Settings panel: German federal state for public holidays |
| `CategoryReorderPopover` | Drag-to-reorder category list |
| `CloudSyncSettings` | Settings panel: OneDrive auth status and sign-in/out |
| `ConfirmDialog` | Danger-aware confirmation modal (portal). Props: `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`, `danger` |
| `CustomCategorySettings` | Settings panel: add / remove custom categories |
| `DayTypePicker` | Button group to set a day's type (WorkDay, Vacation, SickDay, etc.) |
| `DefaultLocationSettings` | Settings panel: default work location (Office / Remote) |
| `ExcelMappingSettings` | Settings panel: category → Excel Task ID mapping for sprint export |
| `IncompleteBanner` | Warning banner when a day's hours are unbalanced |
| `KeyboardShortcutLegend` | Keyboard shortcut reference modal (portal), triggered by `?` |
| `LocalExcelFolderSettings` | Settings panel: optional separate folder for Excel workbooks |
| `LocalExcelSettings` | Settings panel: Excel filename selection (local folder mode) |
| `MonthCalendar` | Calendar grid with colour-coded day statuses and date selection |
| `MonthGrid` | Spreadsheet-style table: categories × days with inline editing |
| `MonthStatsPanel` | Monthly totals, target, overtime summary |
| `OvertimeBar` | Visual progress bar showing worked vs target vs office percentage |
| `SetupWizard` | First-run wizard: OneDrive OAuth or local folder picker (portal) |
| `SharePointSettings` | Settings panel: SharePoint URL for cloud Excel |
| `SheetSelector` | Settings panel: Excel worksheet selection (cloud mode) |
| `SprintConfigPanel` | Settings panel: sprint length and start date |
| `SprintReportPanel` | Sprint hours breakdown by category with export action |
| `StatusLegend` | Legend explaining the day status colour scheme |
| `TimeEntryPanel` | Day's time entries: create, edit, delete, drag-reorder, live tracking |
| `WorkedHoursCell` | Clickable table cell that opens a work period mini-editor (portal, grid mode) |
| `WorkPeriodPanel` | Day's work periods (clock-in/out): add, edit, remove, merge adjacent |
