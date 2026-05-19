import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudTimeEntryRepository } from './cloud/time-entry-repository'
import { CloudWorkWindowRepository } from './cloud/work-window-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudWorkLocationRepository } from './cloud/work-location-repository'
import { CloudDayTypeOverrideRepository } from './cloud/day-type-override-repository'

/**
 * Single shared storage adapter used by all repositories.
 * Currently backed by localStorage only. When OneDrive auth is configured,
 * replace with FallbackStorageAdapter(onedrive, localStorage).
 */
const storage = new LocalStorageAdapter()

export const configRepo = new CloudConfigRepository(storage)
export const timeEntryRepo = new CloudTimeEntryRepository(storage)
export const workWindowRepo = new CloudWorkWindowRepository(storage)
export const sprintExportRepo = new CloudSprintExportRepository(storage)
export const workLocationRepo = new CloudWorkLocationRepository(storage)
export const dayTypeOverrideRepo = new CloudDayTypeOverrideRepository(storage)
