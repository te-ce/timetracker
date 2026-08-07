import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { SettingsNav } from './SettingsNav'
import { SECTION_DEFS, renderSection } from './SettingsSections'
import { useSettingsScrollSpy } from './useSettingsScrollSpy'

const SECTION_IDS = SECTION_DEFS.map((s) => s.id)

export function SettingsView() {
  const { configRepo } = useRepositories()
  const active = useSettingsScrollSpy(SECTION_IDS)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold dark:text-gray-100">Settings</h2>
      <div className="flex gap-8">
        <SettingsNav sections={SECTION_DEFS} active={active} />
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {SECTION_DEFS.map((section) => (
            <div key={section.id}>{renderSection(section.id, configRepo)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
