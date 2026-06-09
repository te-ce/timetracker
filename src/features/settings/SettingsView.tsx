import { AutoCategorySettings } from './AutoCategorySettings'
import { OvertimeBarSettings } from './OvertimeBarSettings'
import { OfficeStatsSettings } from './OfficeStatsSettings'
import { AppDataFolderSettings } from './AppDataFolderSettings'
import { ClearDataSettings } from './ClearDataSettings'
import { BundeslandSettings } from './BundeslandSettings'
import { WeeklyScheduleSettings } from './WeeklyScheduleSettings'
import { CategorySettings } from './CategorySettings'
import { CloudSyncSettings } from './CloudSyncSettings'
import { DefaultLocationSettings } from './DefaultLocationSettings'
import { RemainingTimeSettings } from './RemainingTimeSettings'
import { RemainingTimeModeSettings } from './RemainingTimeModeSettings'
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
                <OfficeStatsSettings repository={configRepo} />
                {showOfficeStats && <DefaultLocationSettings repository={configRepo} />}
                <OvertimeBarSettings repository={configRepo} />
                <RemainingTimeSettings repository={configRepo} />
                <RemainingTimeModeSettings repository={configRepo} />
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
