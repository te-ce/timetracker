import { AutoCategorySettings } from './AutoCategorySettings'
import { BooleanConfigToggle } from './BooleanConfigToggle'
import { AppDataFolderSettings } from './AppDataFolderSettings'
import { ClearDataSettings } from './ClearDataSettings'
import { BundeslandSettings } from './BundeslandSettings'
import { WeeklyScheduleSettings } from './WeeklyScheduleSettings'
import { CategorySettings } from './CategorySettings'
import { CloudSyncSettings } from './CloudSyncSettings'
import { DefaultLocationSettings } from './DefaultLocationSettings'
import { HotkeySettings } from './HotkeySettings'
import { StartupViewSettings } from './StartupViewSettings'
import { WindowBehaviorSettings } from './WindowBehaviorSettings'
import { LocalExcelFolderSettings } from './LocalExcelFolderSettings'
import { LocalExcelSettings } from './LocalExcelSettings'
import { SharePointSettings } from './SharePointSettings'
import { SheetSelector } from './SheetSelector'
import { SettingsTabs } from './SettingsTabs'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '../../shared/queryKeys'

const localFolder = isLocalFolderMode()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function SettingsView() {
  const { configRepo } = useRepositories()
  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => configRepo.get() })
  const showOfficeStats = config?.officeStats !== false
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold dark:text-gray-100">Settings</h2>
      <SettingsTabs>
        {(activeTab) => {
          if (activeTab === 'schedule') {
            return (
              <>
                <WeeklyScheduleSettings repository={configRepo} />
                <BundeslandSettings repository={configRepo} />
              </>
            )
          }
          if (activeTab === 'work') {
            return (
              <>
                <AutoCategorySettings repository={configRepo} />
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Show office stats"
                  description="Display office vs. remote statistics in the header, overtime bar, and table view. Also shows the work location toggle."
                  isChecked={(c) => c.officeStats !== false}
                  applyChange={(c, checked) => ({ ...c, officeStats: checked })}
                />
                {showOfficeStats && <DefaultLocationSettings repository={configRepo} />}
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Show countdown to planned stop"
                  description="When a planned stop time is set on the current work period, show the remaining time until that stop in the badge and tab title. Disable to always show remaining time until the daily target is reached."
                  isChecked={(c) => c.remainingTimeReference !== 'target-hours'}
                  applyChange={(c, checked) => ({
                    ...c,
                    remainingTimeReference: checked ? 'planned-stop' : 'target-hours',
                  })}
                />
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Show remaining until today's target only"
                  description="When enabled, the remaining time in the badge, overtime bar, and taskbar shows how much time is left until today's target hours are met — without subtracting prior overtime carry-over. Disable to show the time left until your cumulative overtime balance reaches zero."
                  isChecked={(c) => c.remainingTimeMode === 'until-daily-target'}
                  applyChange={(c, checked) => ({
                    ...c,
                    remainingTimeMode: checked ? 'until-daily-target' : 'until-zero-overtime',
                  })}
                />
                <CategorySettings repository={configRepo} />
              </>
            )
          }
          if (activeTab === 'storage') {
            return (
              <>
                {!localFolder && <CloudSyncSettings />}
                {localFolder ? (
                  <>
                    <AppDataFolderSettings />
                    <LocalExcelFolderSettings />
                    <LocalExcelSettings repository={configRepo} />
                  </>
                ) : (
                  <>
                    <SharePointSettings repository={configRepo} />
                    <SheetSelector repository={configRepo} />
                  </>
                )}
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Archive sprint to separate sheet"
                  description="After exporting, also write the sprint data to a new sheet named after the sprint dates."
                  isChecked={(c) => c.archiveSprintSheet === true}
                  applyChange={(c, checked) => ({ ...c, archiveSprintSheet: checked })}
                />
              </>
            )
          }
          if (activeTab === 'app') {
            return (
              <>
                {isElectron && (
                  <BooleanConfigToggle
                    repository={configRepo}
                    label="Launch at login"
                    description="Start Timetracker automatically when you log in."
                    isChecked={(c) => c.launchAtLogin ?? false}
                    applyChange={(c, checked) => ({ ...c, launchAtLogin: checked })}
                    onAfterSave={(checked) => window.electronAPI?.autolaunch.set(checked)}
                    variant="spaced"
                  />
                )}
                {isElectron && <WindowBehaviorSettings repository={configRepo} />}
                {isElectron && (
                  <BooleanConfigToggle
                    repository={configRepo}
                    label="Show worked hours in tray menu"
                    description="Display the detailed hours breakdown in the tray icon menu. The remaining/overtime badge next to the icon is always shown."
                    isChecked={(c) => c.showWorkedHoursInTray !== false}
                    applyChange={(c, checked) => ({ ...c, showWorkedHoursInTray: checked })}
                  />
                )}
                {isElectron && (
                  <BooleanConfigToggle
                    repository={configRepo}
                    label="Show worked hours in task menu"
                    description="Display the detailed hours breakdown in the app icon's Dock context menu (macOS)."
                    isChecked={(c) => c.showWorkedHoursInTaskMenu !== false}
                    applyChange={(c, checked) => ({ ...c, showWorkedHoursInTaskMenu: checked })}
                  />
                )}
                <StartupViewSettings repository={configRepo} />
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Show total hours worked today"
                  description="When enabled, the header badge and taskbar display total hours worked today instead of time remaining. Useful if you prefer to track progress rather than countdown."
                  isChecked={(c) => c.showTotalWorked === true}
                  applyChange={(c, checked) => ({ ...c, showTotalWorked: checked })}
                />
                <BooleanConfigToggle
                  repository={configRepo}
                  label="Show worked hours in navigation"
                  description="Display the remaining/overtime hours badge in the top navigation bar."
                  isChecked={(c) => c.showWorkedHoursInNav !== false}
                  applyChange={(c, checked) => ({ ...c, showWorkedHoursInNav: checked })}
                />
                <HotkeySettings repository={configRepo} />
              </>
            )
          }
          return <ClearDataSettings />
        }}
      </SettingsTabs>
    </div>
  )
}
