import { AutoCategorySettings } from '../components/AutoCategorySettings'
import { BundeslandSettings } from '../components/BundeslandSettings'
import { CategorySettings } from '../components/CategorySettings'
import { CloudSyncSettings } from '../components/CloudSyncSettings'
import { DefaultLocationSettings } from '../components/DefaultLocationSettings'
import { LaunchAtLoginSettings } from '../components/LaunchAtLoginSettings'
import { LocalExcelFolderSettings } from '../components/LocalExcelFolderSettings'
import { LocalExcelSettings } from '../components/LocalExcelSettings'
import { SharePointSettings } from '../components/SharePointSettings'
import { SheetSelector } from '../components/SheetSelector'
import { configRepo } from '../repositories/shared'
import { isLocalFolderMode } from '../auth/bootstrapConfig'

const localFolder = isLocalFolderMode()
const isElectron = typeof window !== 'undefined' && !!window.electronAPI

export function SettingsView() {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold dark:text-gray-100">Settings</h2>
      {!localFolder && <CloudSyncSettings />}
      <AutoCategorySettings repository={configRepo} />
      <BundeslandSettings repository={configRepo} />
      <DefaultLocationSettings repository={configRepo} />
      {localFolder ? (
        <>
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
    </div>
  )
}
