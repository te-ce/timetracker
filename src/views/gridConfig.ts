import type { AppConfig, WorkLocation } from '../repositories/types'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'

export interface GridConfig {
  autoCategory: string | null
  customCategories: string[]
  sprintStartDate: string | null
  sprintLengthDays: number
  defaultWorkLocation: WorkLocation | null
}

export function resolveGridConfig(config: AppConfig | undefined): GridConfig {
  const src = config ?? DEFAULT_APP_CONFIG
  return {
    autoCategory: src.autoCategory ?? null,
    customCategories: src.customCategories,
    sprintStartDate: src.sprintStartDate ?? null,
    sprintLengthDays: src.sprintLengthDays,
    defaultWorkLocation: src.defaultWorkLocation ?? null,
  }
}
