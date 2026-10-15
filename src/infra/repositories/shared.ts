import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { OneDriveStorageAdapter } from '../storage/onedrive-adapter'
import { FallbackStorageAdapter } from '../storage/fallback-adapter'
import { LocalFolderStorageAdapter } from '../storage/local-folder-adapter'
import { ElectronStorageAdapter } from '../storage/electron-adapter'
import { ElectronLocalFolderStorageAdapter } from '../storage/electron-local-folder-adapter'
import { getAccessToken, msalInstance } from '../auth/msalInstance'
import { useSyncStatus } from '../storage/sync-status'
import { isLocalFolderMode } from '../auth/bootstrapConfig'
import type { StorageAdapter } from '../storage/adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudMonthRepository } from './cloud/month-repository'
import { TrashRepository } from './trash-repository'

function makeStorage(): StorageAdapter {
  if (isLocalFolderMode()) {
    return window.electronAPI ? new ElectronLocalFolderStorageAdapter() : new LocalFolderStorageAdapter()
  }
  const offlineFallback = window.electronAPI ? new ElectronStorageAdapter() : new LocalStorageAdapter()
  // Without MSAL config OneDrive is unreachable; every write would sit pending forever.
  if (!msalInstance) return offlineFallback
  return new FallbackStorageAdapter(new OneDriveStorageAdapter(getAccessToken), offlineFallback, (count) =>
    useSyncStatus.setState({ pendingWrites: count }),
  )
}

const storage: StorageAdapter = makeStorage()

/** Retries uploading writes OneDrive has not accepted yet (no-op in local modes). */
export function flushPendingWrites(): Promise<void> {
  return storage instanceof FallbackStorageAdapter ? storage.flush() : Promise.resolve()
}

export const configRepo = new CloudConfigRepository(storage)
export const monthRepo = new CloudMonthRepository(storage)
export const sprintExportRepo = new CloudSprintExportRepository(storage)
export const trashRepo = new TrashRepository(storage, monthRepo)

export function resetAllRepositories(): void {
  configRepo.clearCache()
  monthRepo.clearCache()
  sprintExportRepo.clearCache()
  trashRepo.clearCache()
}
