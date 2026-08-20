import { isLocalFolderMode } from '../../../infra/auth/bootstrapConfig'
import type { ConfigRepository } from '../../../infra/repositories/types'
import { AppDataFolderSettings } from '../AppDataFolderSettings'
import { CloudSyncSettings } from '../CloudSyncSettings'
import { LocalExcelFolderSettings } from '../LocalExcelFolderSettings'
import { LocalExcelSettings } from '../LocalExcelSettings'
import { SettingSection } from '../SettingSection'
import { SettingToggle } from '../SettingToggle'
import { SharePointSettings } from '../SharePointSettings'
import { SheetSelector } from '../SheetSelector'

const localFolder = isLocalFolderMode()

export function SyncStorageSection({ repository }: { repository: ConfigRepository }) {
  return (
    <SettingSection id="sync-storage" title="Sync & Storage" description="Where your data is stored and synced from.">
      {!localFolder && <CloudSyncSettings />}
      {localFolder ? (
        <>
          <AppDataFolderSettings />
          <LocalExcelFolderSettings />
          <LocalExcelSettings repository={repository} />
        </>
      ) : (
        <>
          <SharePointSettings repository={repository} />
          <SheetSelector repository={repository} />
        </>
      )}
      <SettingToggle
        repository={repository}
        label="Archive sprint to separate sheet"
        description="After exporting, also write the sprint data to a new sheet named after the sprint dates."
        isChecked={(c) => c.archiveSprintSheet === true}
        applyChange={(c, checked) => ({ ...c, archiveSprintSheet: checked })}
      />
    </SettingSection>
  )
}
