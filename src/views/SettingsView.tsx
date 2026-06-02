import { AutoCategorySettings } from '../components/AutoCategorySettings'
import { AppDataFolderSettings } from '../components/AppDataFolderSettings'
import { ClearDataSettings } from '../components/ClearDataSettings'
import { BundeslandSettings } from '../components/BundeslandSettings'
import { CategorySettings } from '../components/CategorySettings'
import { CloudSyncSettings } from '../components/CloudSyncSettings'
import { DefaultLocationSettings } from '../components/DefaultLocationSettings'
import { HotkeySettings } from '../components/HotkeySettings'
import { LaunchAtLoginSettings } from '../components/LaunchAtLoginSettings'
import { WindowBehaviorSettings } from '../components/WindowBehaviorSettings'
import { LocalExcelFolderSettings } from '../components/LocalExcelFolderSettings'
import { LocalExcelSettings } from '../components/LocalExcelSettings'
import { SharePointSettings } from '../components/SharePointSettings'
import { SheetSelector } from '../components/SheetSelector'
import { useRepositories } from '../repositories/RepositoryContext'
import { isLocalFolderMode } from '../auth/bootstrapConfig'

const localFolder = isLocalFolderMode()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function SettingsView() {
  const { configRepo } = useRepositories()
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold dark:text-gray-100">Settings</h2>
      {!localFolder && <CloudSyncSettings />}
      <AutoCategorySettings repository={configRepo} />
      <BundeslandSettings repository={configRepo} />
      <DefaultLocationSettings repository={configRepo} />
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
      <CategorySettings repository={configRepo} />
      {isElectron && <LaunchAtLoginSettings repository={configRepo} />}
      {isElectron && <WindowBehaviorSettings repository={configRepo} />}
      <HotkeySettings repository={configRepo} />
      <ClearDataSettings />
    </div>
  )
}
