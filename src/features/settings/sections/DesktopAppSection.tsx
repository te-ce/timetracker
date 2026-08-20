import type { ConfigRepository } from '../../../infra/repositories/types'
import { HotkeySettings } from '../HotkeySettings'
import { SettingSection } from '../SettingSection'
import { SettingToggle } from '../SettingToggle'
import { WindowBehaviorSettings } from '../WindowBehaviorSettings'

export function DesktopAppSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="desktop-app"
      title="Desktop App"
      description="Window, tray, and shortcut behavior (Electron only)."
    >
      <SettingToggle
        repository={repository}
        label="Launch at login"
        description="Start Timetracker automatically when you log in."
        isChecked={(c) => c.launchAtLogin ?? false}
        applyChange={(c, checked) => ({ ...c, launchAtLogin: checked })}
        onAfterSave={(checked) => window.electronAPI?.autolaunch.set(checked)}
      />
      <WindowBehaviorSettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show remaining hours in tray icon"
        description="Display the remaining/overtime badge next to the tray icon. Toggle from the tray menu or the presenting-mode hotkey."
        isChecked={(c) => c.showWorkedHoursInTray !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInTray: checked })}
      />
      <SettingToggle
        repository={repository}
        label="Show detailed breakdown in tray menu"
        description="Display the hours breakdown in the tray icon's dropdown menu and tooltip."
        isChecked={(c) => c.showWorkedHoursInTrayBreakdown !== false}
        applyChange={(c, checked) => ({ ...c, showWorkedHoursInTrayBreakdown: checked })}
      />
      <HotkeySettings repository={repository} />
    </SettingSection>
  )
}
