import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { OneDriveStorageAdapter } from '../storage/onedrive-adapter'
import { FallbackStorageAdapter } from '../storage/fallback-adapter'
import { LocalFolderStorageAdapter } from '../storage/local-folder-adapter'
import { ElectronStorageAdapter } from '../storage/electron-adapter'
import { ElectronLocalFolderStorageAdapter } from '../storage/electron-local-folder-adapter'
import { getAccessToken, msalInstance } from '../auth/msalInstance'
import { useSyncStatus } from '../storage/sync-status'
import { isLocalFolderMode, mirrorLocalFolderMode } from '../auth/bootstrapConfig'
import type { StorageAdapter } from '../storage/adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudMonthRepository } from './cloud/month-repository'
import { TrashRepository } from './trash-repository'
import { logCalls } from '../../shared/logCalls'

// Payloads are whole months/configs; the key says what was touched.
const keyOnly = (args: unknown[]) => args[0]
const logged = (adapter: StorageAdapter, name: string) => logCalls(adapter, name, keyOnly)

function makeStorage(): StorageAdapter {
  mirrorLocalFolderMode()
  if (isLocalFolderMode()) {
    return logged(
      window.electronAPI ? new ElectronLocalFolderStorageAdapter() : new LocalFolderStorageAdapter(),
      'storage:localFolder',
    )
  }
  const offlineFallback = logged(
    window.electronAPI ? new ElectronStorageAdapter() : new LocalStorageAdapter(),
    'storage:local',
  )
  // Without MSAL config OneDrive is unreachable; every write would sit pending forever.
  if (!msalInstance) return offlineFallback
  return new FallbackStorageAdapter(
    logged(new OneDriveStorageAdapter(getAccessToken), 'storage:onedrive'),
    offlineFallback,
    (count) => useSyncStatus.setState({ pendingWrites: count }),
  )
}

const storage: StorageAdapter = makeStorage()

/** Retries uploading writes OneDrive has not accepted yet (no-op in local modes). */
export function flushPendingWrites(): Promise<void> {
  return storage instanceof FallbackStorageAdapter ? storage.flush() : Promise.resolve()
}

const cloudMonthRepo = new CloudMonthRepository(storage)
export const configRepo = logCalls(new CloudConfigRepository(storage), 'configRepo')
export const monthRepo = logCalls(cloudMonthRepo, 'monthRepo')
export const sprintExportRepo = logCalls(new CloudSprintExportRepository(storage), 'sprintExportRepo')
export const trashRepo = logCalls(new TrashRepository(storage, cloudMonthRepo), 'trashRepo')

export function resetAllRepositories(): void {
  configRepo.clearCache()
  monthRepo.clearCache()
  sprintExportRepo.clearCache()
  trashRepo.clearCache()
}
