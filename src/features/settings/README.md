# features/settings/

SettingsView — all app configuration. Covers MSAL bootstrap, storage mode, categories (fixed + custom), sprint config, Excel mapping, display preferences (theme, time format, hotkeys), and data management.

Also contains the **SetupWizard** shown on first launch to choose sync mode.

## Key concepts

- **BootstrapConfig** — `{ clientId, tenantId }` stored in localStorage; required before MSAL init. Set in MSAL settings.
- **AppConfig** — full app configuration stored in the repository (OneDrive / local folder / localStorage).
- **ExcelMapping** — `Record<category, taskId>` linking categories to SharePoint Excel rows.
- **AutoCategory** — global default category for new WorkPeriods; overridable per day.

## Files

| File                             | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `SettingsView.tsx`               | Root view — tab-based layout of all setting panels                 |
| `SetupWizard.tsx`                | First-launch wizard to pick sync mode (MSAL / local folder / skip) |
| `AppDataFolderSettings.tsx`      | Local folder path selection                                        |
| `CloudSyncSettings.tsx`          | OneDrive sync status and sign-in/out                               |
| `SharePointSettings.tsx`         | SharePoint URL and sheet selector for Excel export                 |
| `LocalExcelSettings.tsx`         | Local Excel file picker                                            |
| `LocalExcelFolderSettings.tsx`   | Local folder picker for Excel files                                |
| `SheetSelector.tsx`              | Dropdown to pick the target worksheet                              |
| `CategorySettings.tsx`           | Enable/disable and reorder the fixed categories                    |
| `CustomCategorySettings.tsx`     | Add/remove dynamic categories                                      |
| `AutoCategorySettings.tsx`       | Set the global AutoCategory default                                |
| `ExcelMappingSettings.tsx`       | Map app categories to Excel row Task IDs                           |
| `BundeslandSettings.tsx`         | German federal state selection (for public holidays)               |
| `BooleanConfigToggle.tsx`        | Generic single-boolean-field AppConfig toggle (checkbox + label)   |
| `useConfigFieldMutation.ts`      | Generic single-field AppConfig read+mutate hook (non-boolean)      |
| `HotkeySettings.tsx`             | Keyboard shortcut configuration                                    |
| `WindowBehaviorSettings.tsx`     | Electron window hide-on-close behavior                             |
| `ClearDataSettings.tsx`          | Destructive data reset                                             |
| `excelMapping.ts`                | ExcelMapping derivation helpers                                    |
| `exportStatus.ts`                | ExportStatus derivation from sprint export records                 |
| `useCategoryMutations.ts`        | Mutations for category config changes                              |
| `useDayTypeOverrideMutations.ts` | Mutations for per-day DayType overrides                            |
| `index.ts`                       | Public API barrel                                                  |

## How it works

All settings read from and write to `AppConfig` via TanStack Query mutations. The config repository persists to OneDrive (synced mode) or localStorage/local folder (offline mode).

`SetupWizard` is rendered when `BootstrapConfig` is absent — it writes `clientId`/`tenantId` to localStorage before MSAL is initialized, then reloads the app.
