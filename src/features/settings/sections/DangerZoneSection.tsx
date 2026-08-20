import { ClearDataSettings } from '../ClearDataSettings'
import { SettingSection } from '../SettingSection'

export function DangerZoneSection() {
  return (
    <SettingSection id="danger-zone" title="Danger Zone" description="Actions that reset your local app data." danger>
      <ClearDataSettings />
    </SettingSection>
  )
}
