import { LocalStorageAdapter } from '../storage/localstorage-adapter'
import { CloudConfigRepository } from './cloud/config-repository'
import { CloudTimeEntryRepository } from './cloud/time-entry-repository'
import { CloudWorkPeriodRepository } from './cloud/work-period-repository'
import { CloudSprintExportRepository } from './cloud/sprint-export-repository'
import { CloudWorkLocationRepository } from './cloud/work-location-repository'
import { CloudDayTypeOverrideRepository } from './cloud/day-type-override-repository'
import { CloudAutoCategoryOverrideRepository } from './cloud/auto-category-override-repository'
import { CloudDayConfirmationRepository } from './cloud/day-confirmation-repository'
import { CloudTimeTrackingRepository } from './cloud/time-tracking-repository'

/**
 * Single shared storage adapter used by all repositories.
 * Currently backed by localStorage only. When OneDrive auth is configured,
 * replace with FallbackStorageAdapter(onedrive, localStorage).
 */
const storage = new LocalStorageAdapter()

export const configRepo = new CloudConfigRepository(storage)
export const timeEntryRepo = new CloudTimeEntryRepository(storage)
export const workPeriodRepo = new CloudWorkPeriodRepository(storage)
export const sprintExportRepo = new CloudSprintExportRepository(storage)
export const workLocationRepo = new CloudWorkLocationRepository(storage)
export const dayTypeOverrideRepo = new CloudDayTypeOverrideRepository(storage)
export const autoCategoryOverrideRepo = new CloudAutoCategoryOverrideRepository(storage)
export const dayConfirmationRepo = new CloudDayConfirmationRepository(storage)
export const timeTrackingRepo = new CloudTimeTrackingRepository(storage)
