import { AutoCategorySettings } from '../components/AutoCategorySettings'
import { BundeslandSettings } from '../components/BundeslandSettings'
import { CustomCategorySettings } from '../components/CustomCategorySettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'

// Temporary in-memory repo until Firestore + MSAL auth is wired
const configRepo = new InMemoryConfigRepository()

export function SettingsView() {
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold">Settings</h2>
      <AutoCategorySettings repository={configRepo} />
      <BundeslandSettings repository={configRepo} />
      <CustomCategorySettings repository={configRepo} />
    </div>
  )
}
