import { AutoCategorySettings } from '../components/AutoCategorySettings'
import { BundeslandSettings } from '../components/BundeslandSettings'
import { CustomCategorySettings } from '../components/CustomCategorySettings'
import { DefaultLocationSettings } from '../components/DefaultLocationSettings'
import { configRepo } from '../repositories/shared'

export function SettingsView() {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <AutoCategorySettings repository={configRepo} />
      <BundeslandSettings repository={configRepo} />
      <DefaultLocationSettings repository={configRepo} />
      <CustomCategorySettings repository={configRepo} />
    </div>
  )
}
