import { useQuery } from '@tanstack/react-query'
import type { ConfigRepository } from '../../../infra/repositories/types'
import { QUERY_KEYS } from '../../../shared/queryKeys'
import { DefaultLocationSettings } from '../DefaultLocationSettings'
import { SettingSection } from '../SettingSection'
import { SettingToggle } from '../SettingToggle'

export function WorkLocationSection({ repository }: { repository: ConfigRepository }) {
  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })
  const showOfficeStats = config?.officeStats !== false
  return (
    <SettingSection
      id="work-location"
      title="Work Location & Tracking"
      description="Office vs. remote tracking and how remaining time is calculated."
    >
      <SettingToggle
        repository={repository}
        label="Show office stats"
        description="Display office vs. remote statistics in the header, overtime bar, and table view. Also shows the work location toggle."
        isChecked={(c) => c.officeStats !== false}
        applyChange={(c, checked) => ({ ...c, officeStats: checked })}
      />
      {showOfficeStats && <DefaultLocationSettings repository={repository} />}
      <SettingToggle
        repository={repository}
        label="Show countdown to planned stop"
        description="When a planned stop time is set on the current work period, show the remaining time until that stop in the badge and tab title. Disable to always show remaining time until the daily target is reached."
        isChecked={(c) => c.remainingTimeReference !== 'target-hours'}
        applyChange={(c, checked) => ({
          ...c,
          remainingTimeReference: checked ? 'planned-stop' : 'target-hours',
        })}
      />
      <SettingToggle
        repository={repository}
        label="Show remaining until today's target only"
        description="When enabled, the remaining time in the badge, overtime bar, and taskbar shows how much time is left until today's target hours are met — without subtracting prior overtime carry-over. Disable to show the time left until your cumulative overtime balance reaches zero."
        isChecked={(c) => c.remainingTimeMode === 'until-daily-target'}
        applyChange={(c, checked) => ({
          ...c,
          remainingTimeMode: checked ? 'until-daily-target' : 'until-zero-overtime',
        })}
      />
    </SettingSection>
  )
}
