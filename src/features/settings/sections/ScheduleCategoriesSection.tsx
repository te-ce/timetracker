import type { ConfigRepository } from '../../../infra/repositories/types'
import { AutoCategorySettings } from '../AutoCategorySettings'
import { BundeslandSettings } from '../BundeslandSettings'
import { CategorySettings } from '../CategorySettings'
import { SettingSection } from '../SettingSection'
import { SettingToggle } from '../SettingToggle'
import { WeeklyScheduleSettings } from '../WeeklyScheduleSettings'

export function ScheduleCategoriesSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="schedule-categories"
      title="Schedule & Categories"
      description="Weekly targets, public holidays, and how work is categorized."
    >
      <WeeklyScheduleSettings repository={repository} />
      <BundeslandSettings repository={repository} />
      <AutoCategorySettings repository={repository} />
      <CategorySettings repository={repository} />
      <SettingToggle
        repository={repository}
        label="Show category description as primary"
        description="When a category has a description, show it as the main text and the category name as a fallback wherever categories are displayed."
        isChecked={(c) => c.preferCategoryDescriptionAsPrimary === true}
        applyChange={(c, checked) => ({ ...c, preferCategoryDescriptionAsPrimary: checked })}
      />
    </SettingSection>
  )
}
