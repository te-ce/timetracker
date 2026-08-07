# features/settings/

SettingsView — all app configuration. Covers MSAL bootstrap, storage mode, categories (fixed + custom), sprint config, Excel mapping, display preferences (theme, time format, hotkeys), and data management.

Also contains the **SetupWizard** shown on first launch to choose sync mode.

## Key concepts

- **BootstrapConfig** — `{ clientId, tenantId }` stored in localStorage; required before MSAL init. Set in MSAL settings.
- **AppConfig** — full app configuration stored in the repository (OneDrive / local folder / localStorage).
- **ExcelMapping** — `Record<category, taskId>` linking categories to SharePoint Excel rows.
- **AutoCategory** — global default category for new WorkPeriods; overridable per day.

## Files

| File                             | Purpose                                                                |
| -------------------------------- | ---------------------------------------------------------------------- |
| `SettingsView.tsx`               | Root view — left-rail nav + scrolling sections (see "Layout" below)    |
| `SettingsNav.tsx`                | Sticky left-rail jump list, highlights the section in view             |
| `SettingsSections.tsx`           | Section grouping (`SECTION_DEFS`) and each section's panel composition |
| `useSettingsScrollSpy.ts`        | Tracks which section is in view, drives `SettingsNav`'s highlight      |
| `SettingSection.tsx`             | Card wrapper for a group of related settings                           |
| `SettingToggle.tsx`              | Generic single-boolean-field AppConfig toggle (switch + card)          |
| `SetupWizard.tsx`                | First-launch wizard to pick sync mode (MSAL / local folder / skip)     |
| `AppDataFolderSettings.tsx`      | Local folder path selection                                            |
| `CloudSyncSettings.tsx`          | OneDrive sync status and sign-in/out                                   |
| `SharePointSettings.tsx`         | SharePoint URL and sheet selector for Excel export                     |
| `LocalExcelSettings.tsx`         | Local Excel file picker                                                |
| `LocalExcelFolderSettings.tsx`   | Local folder picker for Excel files                                    |
| `SheetSelector.tsx`              | Dropdown to pick the target worksheet                                  |
| `CategorySettings.tsx`           | Enable/disable and reorder the fixed categories                        |
| `AutoCategorySettings.tsx`       | Set the global AutoCategory default                                    |
| `BundeslandSettings.tsx`         | German federal state selection (for public holidays)                   |
| `useConfigFieldMutation.ts`      | Generic single-field AppConfig read+mutate hook (non-boolean)          |
| `useDirectoryPicker.ts`          | Generic directory-picker state machine (File System Access API)        |
| `HotkeySettings.tsx`             | Keyboard shortcut configuration                                        |
| `WindowBehaviorSettings.tsx`     | Electron window hide-on-close behavior                                 |
| `ClearDataSettings.tsx`          | Destructive data reset (via the shared `ConfirmDialog`)                |
| `excelMapping.ts`                | ExcelMapping derivation helpers                                        |
| `useCategoryMutations.ts`        | Mutations for category config changes                                  |
| `useDayTypeOverrideMutations.ts` | Mutations for per-day status (day type override + half-day leave)      |
| `index.ts`                       | Public API barrel                                                      |

## Layout

Settings are a single scrolling page with a sticky left-rail nav (`SettingsNav`), grouped
by task rather than by `AppConfig` field history: **General** (theme, time format,
startup view, nav display toggles), **Schedule & Categories** (weekly targets, holidays,
categories), **Work Location & Tracking**, **Sync & Storage**, **Desktop App**
(Electron-only), **Danger Zone**. `SettingsSections.tsx` owns the grouping
(`SECTION_DEFS`) and renders each section (`renderSection`); `useSettingsScrollSpy`
tracks which section is in view so `SettingsNav` can highlight it.

## How it works

All settings read from and write to `AppConfig` via TanStack Query mutations. The config repository persists to OneDrive (synced mode) or localStorage/local folder (offline mode).

`SetupWizard` is rendered when `BootstrapConfig` is absent — it writes `clientId`/`tenantId` to localStorage before MSAL is initialized, then reloads the app.
