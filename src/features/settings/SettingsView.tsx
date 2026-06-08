import { AutoCategorySettings } from './AutoCategorySettings'
import { OvertimeBarSettings } from './OvertimeBarSettings'
import { AppDataFolderSettings } from './AppDataFolderSettings'
import { ClearDataSettings } from './ClearDataSettings'
import { BundeslandSettings } from './BundeslandSettings'
import { WeeklyScheduleSettings } from './WeeklyScheduleSettings'
import { CategorySettings } from './CategorySettings'
import { CloudSyncSettings } from './CloudSyncSettings'
import { DefaultLocationSettings } from './DefaultLocationSettings'
import { HotkeySettings } from './HotkeySettings'
import { LaunchAtLoginSettings } from './LaunchAtLoginSettings'
import { WindowBehaviorSettings } from './WindowBehaviorSettings'
import { LocalExcelFolderSettings } from './LocalExcelFolderSettings'
import { LocalExcelSettings } from './LocalExcelSettings'
import { SharePointSettings } from './SharePointSettings'
import { SheetSelector } from './SheetSelector'
import { SettingsTabs } from './SettingsTabs'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { isLocalFolderMode } from '../../infra/auth/bootstrapConfig'

const localFolder = isLocalFolderMode()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function SettingsView() {
  const { configRepo } = useRepositories()
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
                <DefaultLocationSettings repository={configRepo} />
                <OvertimeBarSettings repository={configRepo} />
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
              </>
            )
          }
          if (activeTab === 'app') {
            return (
              <>
                {isElectron && <LaunchAtLoginSettings repository={configRepo} />}
                {isElectron && <WindowBehaviorSettings repository={configRepo} />}
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
