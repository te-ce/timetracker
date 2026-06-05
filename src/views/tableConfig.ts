import type { AppConfig, WorkLocation } from '../repositories/types'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'

export interface TableConfig {
  autoCategory: string | null
  customCategories: string[]
  sprintStartDate: string | null
  sprintLengthDays: number
  defaultWorkLocation: WorkLocation | null
}

export function resolveTableConfig(config: AppConfig | undefined): TableConfig {
  const src = config ?? DEFAULT_APP_CONFIG
  return {
    autoCategory: src.autoCategory ?? null,
    customCategories: src.customCategories,
    sprintStartDate: src.sprintStartDate ?? null,
    sprintLengthDays: src.sprintLengthDays,
    defaultWorkLocation: src.defaultWorkLocation ?? null,
  }
}
