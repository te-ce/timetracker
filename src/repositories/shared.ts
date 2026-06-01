import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { OneDriveStorageAdapter } from '../storage/onedrive-adapter'
import { FallbackStorageAdapter } from '../storage/fallback-adapter'
import { LocalFolderStorageAdapter } from '../storage/local-folder-adapter'
import { ElectronStorageAdapter } from '../storage/electron-adapter'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'
import type { StorageAdapter } from '../storage/adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudTimeTrackingRepository } from './cloud/time-tracking-repository'
import { CloudMonthRepository } from './cloud/month-repository'

function makeStorage(): StorageAdapter {
  if (isLocalFolderMode()) return new LocalFolderStorageAdapter()
  const offlineFallback = window.electronAPI
    ? new ElectronStorageAdapter()
    : new LocalStorageAdapter()
  return new FallbackStorageAdapter(new OneDriveStorageAdapter(getAccessToken), offlineFallback)
}

const storage: StorageAdapter = makeStorage()

export const configRepo = new CloudConfigRepository(storage)
export const monthRepo = new CloudMonthRepository(storage)
export const sprintExportRepo = new CloudSprintExportRepository(storage)
export const timeTrackingRepo = new CloudTimeTrackingRepository(storage)

export function resetAllRepositories(): void {
  configRepo.clearCache()
  monthRepo.clearCache()
  sprintExportRepo.clearCache()
}
