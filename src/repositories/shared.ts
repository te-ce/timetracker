import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { OneDriveStorageAdapter } from '../storage/onedrive-adapter'
import { FallbackStorageAdapter } from '../storage/fallback-adapter'
import { LocalFolderStorageAdapter } from '../storage/local-folder-adapter'
import { ElectronStorageAdapter } from '../storage/electron-adapter'
import { getAccessToken } from '../auth/msalInstance'
import { isLocalFolderMode } from '../auth/bootstrapConfig'
import type { StorageAdapter } from '../storage/adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudTimeEntryRepository } from './cloud/time-entry-repository'
import { CloudWorkPeriodRepository } from './cloud/work-period-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudWorkLocationRepository } from './cloud/work-location-repository'
import { CloudDayTypeOverrideRepository } from './cloud/day-type-override-repository'
import { CloudAutoCategoryOverrideRepository } from './cloud/auto-category-override-repository'
import { CloudDayConfirmationRepository } from './cloud/day-confirmation-repository'
import { CloudTimeTrackingRepository } from './cloud/time-tracking-repository'
import { CloudDayNoteRepository } from './cloud/day-note-repository'

function makeStorage(): StorageAdapter {
  if (isLocalFolderMode()) return new LocalFolderStorageAdapter()
  const offlineFallback = window.electronAPI
    ? new ElectronStorageAdapter()
    : new LocalStorageAdapter()
  return new FallbackStorageAdapter(new OneDriveStorageAdapter(getAccessToken), offlineFallback)
}

const storage: StorageAdapter = makeStorage()

export const configRepo = new CloudConfigRepository(storage)
export const timeEntryRepo = new CloudTimeEntryRepository(storage)
export const workPeriodRepo = new CloudWorkPeriodRepository(storage)
export const sprintExportRepo = new CloudSprintExportRepository(storage)
export const workLocationRepo = new CloudWorkLocationRepository(storage)
export const dayTypeOverrideRepo = new CloudDayTypeOverrideRepository(storage)
export const autoCategoryOverrideRepo = new CloudAutoCategoryOverrideRepository(storage)
export const dayConfirmationRepo = new CloudDayConfirmationRepository(storage)
export const timeTrackingRepo = new CloudTimeTrackingRepository(storage)
export const dayNoteRepo = new CloudDayNoteRepository(storage)

/**
 * Clears all repository caches. Call this after login so the next read
 * fetches fresh data from OneDrive instead of the stale localStorage-backed cache.
 */
export function resetAllRepositories(): void {
  configRepo.clearCache()
  timeEntryRepo.clearCache()
  workPeriodRepo.clearCache()
  sprintExportRepo.clearCache()
  workLocationRepo.clearCache()
  dayTypeOverrideRepo.clearCache()
  autoCategoryOverrideRepo.clearCache()
  dayConfirmationRepo.clearCache()
  dayNoteRepo.clearCache()
}
