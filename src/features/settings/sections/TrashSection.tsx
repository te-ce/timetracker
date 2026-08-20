import type { ConfigRepository } from '../../../infra/repositories/types'
import { SettingSection } from '../SettingSection'
import { TrashSettings } from '../TrashSettings'

export function TrashSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection
      id="trash"
      title="Trash"
      description="Deleted months, days, and local-data backups, kept for a configurable period before permanent removal."
    >
      <TrashSettings repository={repository} />
    </SettingSection>
  )
}
