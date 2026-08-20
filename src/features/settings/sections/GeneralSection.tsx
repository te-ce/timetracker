import type { ConfigRepository } from '../../../infra/repositories/types'
import { SettingSection } from '../SettingSection'
import { SettingToggle } from '../SettingToggle'
import { StartupViewSettings } from '../StartupViewSettings'
import { ThemeRow } from './ThemeRow'
import { TimeFormatRow } from './TimeFormatRow'

export function GeneralSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection id="general" title="General" description="Appearance and everyday display preferences.">
      <ThemeRow />
      <TimeFormatRow />
      <StartupViewSettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show worked hours in navigation"
        description="Display the remaining/overtime hours badge in the top navigation bar."
        isChecked={(c) => c.showWorkedHoursInNav !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInNav: checked })}
      />
      <SettingToggle
        repository={repository}
        label="Show total hours worked today"
        description="When enabled, the header badge and taskbar display total hours worked today instead of time remaining. Useful if you prefer to track progress rather than countdown."
        isChecked={(c) => c.showTotalWorked === true}
        applyChange={(c, checked) => ({ ...c, showTotalWorked: checked })}
      />
    </SettingSection>
  )
}
