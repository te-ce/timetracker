import { AutoCategorySettings } from '../components/AutoCategorySettings'
import { BundeslandSettings } from '../components/BundeslandSettings'
import { CloudSyncSettings } from '../components/CloudSyncSettings'
import { CustomCategorySettings } from '../components/CustomCategorySettings'
import { DefaultLocationSettings } from '../components/DefaultLocationSettings'
import { ExcelMappingSettings } from '../components/ExcelMappingSettings'
import { SharePointSettings } from '../components/SharePointSettings'
import { SheetSelector } from '../components/SheetSelector'
import { configRepo } from '../repositories/shared'

export function SettingsView() {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <CloudSyncSettings />
      <AutoCategorySettings repository={configRepo} />
      <BundeslandSettings repository={configRepo} />
      <DefaultLocationSettings repository={configRepo} />
      <CustomCategorySettings repository={configRepo} />
      <SharePointSettings repository={configRepo} />
      <SheetSelector repository={configRepo} />
      <ExcelMappingSettings repository={configRepo} />
    </div>
  )
}
