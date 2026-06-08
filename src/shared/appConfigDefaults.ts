import type { AppConfig } from '../infra/repositories/types'
import { DEFAULT_WEEKDAY_HOURS } from './weekdayHours'

export const DEFAULT_APP_CONFIG: AppConfig = {
  weekdayHours: DEFAULT_WEEKDAY_HOURS,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
  sharepointUrl: null,
  targetSheet: null,
  categoryMapping: {},
  showOvertimeBar: true,
}
