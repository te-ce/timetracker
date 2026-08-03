import type { AppConfig, StartupView, WorkLocation } from '../infra/repositories/types'
import { defaultHotkeyConfig, type HotkeyConfig } from './hotkeyConfig'
import { DEFAULT_WEEKDAY_HOURS, type WeekdayHours } from './weekdayHours'

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

/**
 * AppConfig with every field resolved to its effective value. Readers take
 * this instead of applying their own `??` fallback — the defaults used to be
 * spread over ~40 call sites, several of which disagreed.
 *
 * `startupView` stays nullable on purpose: "unset" means "do not navigate on
 * startup", which is not the same as any of the StartupView values.
 */
export interface ResolvedAppConfig {
  weekdayHours: WeekdayHours
  autoCategory: string | null
  federalState: string | null
  sprintLengthDays: number
  sprintStartDate: string | null
  customCategories: string[]
  categoryOrder: string[]
  defaultWorkLocation: WorkLocation
  sharepointUrl: string | null
  targetSheet: string | null
  categoryMapping: Record<string, string>
  categoryDescriptions: Record<string, string>
  categoryImportOrder: string[]
  localExcelFile: string | null
  launchAtLogin: boolean
  startMinimized: boolean
  closeToTray: boolean
  hotkeys: HotkeyConfig
  showOvertimeBar: boolean
  officeStats: boolean
  showWorkedHoursInNav: boolean
  showWorkedHoursInTray: boolean
  remainingTimeReference: 'planned-stop' | 'target-hours'
  remainingTimeMode: 'until-zero-overtime' | 'until-daily-target'
  showTotalWorked: boolean
  startupView: StartupView | null
  archiveSprintSheet: boolean
}

export function resolveAppConfig(config: AppConfig | undefined): ResolvedAppConfig {
  return {
    weekdayHours: config?.weekdayHours ?? DEFAULT_WEEKDAY_HOURS,
    autoCategory: config?.autoCategory ?? null,
    federalState: config?.federalState ?? null,
    sprintLengthDays: config?.sprintLengthDays ?? 14,
    sprintStartDate: config?.sprintStartDate ?? null,
    customCategories: config?.customCategories ?? [],
    categoryOrder: config?.categoryOrder ?? [],
    defaultWorkLocation: config?.defaultWorkLocation ?? 'Remote',
    sharepointUrl: config?.sharepointUrl ?? null,
    targetSheet: config?.targetSheet ?? null,
    categoryMapping: config?.categoryMapping ?? {},
    categoryDescriptions: config?.categoryDescriptions ?? {},
    categoryImportOrder: config?.categoryImportOrder ?? [],
    localExcelFile: config?.localExcelFile ?? null,
    launchAtLogin: config?.launchAtLogin ?? false,
    startMinimized: config?.startMinimized ?? false,
    closeToTray: config?.closeToTray ?? true,
    hotkeys: config?.hotkeys ?? defaultHotkeyConfig(),
    showOvertimeBar: config?.showOvertimeBar ?? true,
    officeStats: config?.officeStats ?? true,
    showWorkedHoursInNav: config?.showWorkedHoursInNav ?? true,
    showWorkedHoursInTray: config?.showWorkedHoursInTray ?? true,
    remainingTimeReference: config?.remainingTimeReference ?? 'planned-stop',
    remainingTimeMode: config?.remainingTimeMode ?? 'until-zero-overtime',
    showTotalWorked: config?.showTotalWorked ?? false,
    startupView: config?.startupView ?? null,
    archiveSprintSheet: config?.archiveSprintSheet ?? false,
  }
}
