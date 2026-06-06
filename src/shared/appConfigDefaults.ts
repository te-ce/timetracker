import type { AppConfig } from '../infra/repositories/types'

export const DEFAULT_APP_CONFIG: AppConfig = {
  sollstunden: 8,
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
