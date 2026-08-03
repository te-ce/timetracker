# shared/

Cross-cutting utilities used by 2+ features. No feature-specific code lives here. If something is only used by one feature, it belongs in that feature directory.

## Contents

### Domain utilities

| File                   | Purpose                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `autoCategory.ts`      | `resolveAutoCategory()` — resolves the effective category for a day from global default + per-day overrides |
| `categories.ts`        | Fixed category list, category helpers, `UNCATEGORIZED_CATEGORY` sentinel                                    |
| `dateUtils.ts`         | Date manipulation, formatting, ISO parsing helpers                                                          |
| `dayStatus.ts`         | `deriveDayStatus()` — maps WorkedHours + DayType + balance → `DayStatus`                                    |
| `formatHours.ts`       | Decimal hours → `"HH:MM"` or `"H.Xh"` formatting                                                            |
| `holidays.ts`          | German public holiday calculation by Bundesland                                                             |
| `hotkeyConfig.ts`      | Hotkey definitions and resolution                                                                           |
| `periodCategories.ts`  | `calculateCategoryHours()` — derives per-category hours from a WorkPeriod array                             |
| `worktime.ts`          | Worked hours calculation, `Sollstunden` resolution                                                          |
| `appConfigDefaults.ts` | `resolveAppConfig()` — `AppConfig` with every field at its effective value                                  |
| `dayBalance.ts`        | `deriveDayBalance()` — closed/live/projected hours, remaining, planned-stop state                           |
| `statusColors.ts`      | Tailwind color classes for each `DayStatus`                                                                 |
| `queryKeys.ts`         | Centralized TanStack Query key factory (`QUERY_KEYS.*`)                                                     |

### Stores (Zustand)

| File                 | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `authStore.ts`       | Current MSAL auth state — account, access token, sync mode |
| `themeStore.ts`      | Light / dark / system theme preference                     |
| `timeFormatStore.ts` | 12h / 24h time format preference                           |
| `undoStore.ts`       | Global undo stack for reversible mutations                 |

### Hooks

| File                                | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `useCloseOnOutsideClickOrEscape.ts` | Dismiss a popover/dropdown on outside click or Escape key            |
| `useElectronTraySync.ts`            | Keeps the Electron tray icon in sync with tracking state             |
| `useGoalNotification.ts`            | Fires a notification when daily hours goal is met                    |
| `useMsalSync.ts`                    | Keeps authStore in sync with MSAL account state                      |
| `useMonthView.ts`                   | `buildMonthView()` — the month view-model; `useMonthView()` loads it |
| `usePrefetchCurrentMonth.ts`        | Prefetches the current month's data on app load                      |
| `useRemainingHours.ts`              | Today's DayBalance for the nav badge and the tray                    |
| `useClock.ts`                       | Wall-clock "HH:MM", ticking once a minute                            |

### UI components

| File                         | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `ConfirmDialog.tsx`          | Reusable confirmation modal                      |
| `ErrorBoundary.tsx`          | React error boundary for graceful crash recovery |
| `KeyboardShortcutLegend.tsx` | Popover listing active keyboard shortcuts        |
| `Tooltip.tsx`                | Accessible tooltip wrapper                       |
