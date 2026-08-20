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
  sprintRoundingStep: 0,
  sprintRoundingMode: 'nearest',
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
  officeStats: boolean
  showWorkedHoursInNav: boolean
  showWorkedHoursInTray: boolean
  showWorkedHoursInTrayBreakdown: boolean
  remainingTimeReference: 'planned-stop' | 'target-hours'
  remainingTimeMode: 'until-zero-overtime' | 'until-daily-target'
  showTotalWorked: boolean
  startupView: StartupView | null
  archiveSprintSheet: boolean
  sprintRoundingStep: number
  sprintRoundingMode: 'nearest' | 'up' | 'down'
  preferCategoryDescriptionAsPrimary: boolean
}

function pick<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback
}

function resolveDefinedConfig(config: AppConfig): ResolvedAppConfig {
  return {
    weekdayHours: pick(config.weekdayHours, DEFAULT_WEEKDAY_HOURS),
    autoCategory: pick(config.autoCategory, null),
    federalState: pick(config.federalState, null),
    sprintLengthDays: pick(config.sprintLengthDays, 14),
    sprintStartDate: pick(config.sprintStartDate, null),
    customCategories: pick(config.customCategories, []),
    categoryOrder: pick(config.categoryOrder, []),
    defaultWorkLocation: pick(config.defaultWorkLocation, 'Remote'),
    sharepointUrl: pick(config.sharepointUrl, null),
    targetSheet: pick(config.targetSheet, null),
    categoryMapping: pick(config.categoryMapping, {}),
    categoryDescriptions: pick(config.categoryDescriptions, {}),
    categoryImportOrder: pick(config.categoryImportOrder, []),
    localExcelFile: pick(config.localExcelFile, null),
    launchAtLogin: pick(config.launchAtLogin, false),
    startMinimized: pick(config.startMinimized, false),
    closeToTray: pick(config.closeToTray, true),
    hotkeys: pick(config.hotkeys, defaultHotkeyConfig()),
    officeStats: pick(config.officeStats, true),
    showWorkedHoursInNav: pick(config.showWorkedHoursInNav, true),
    showWorkedHoursInTray: pick(config.showWorkedHoursInTray, true),
    showWorkedHoursInTrayBreakdown: pick(config.showWorkedHoursInTrayBreakdown, true),
    remainingTimeReference: pick(config.remainingTimeReference, 'planned-stop'),
    remainingTimeMode: pick(config.remainingTimeMode, 'until-zero-overtime'),
    showTotalWorked: pick(config.showTotalWorked, false),
    startupView: pick(config.startupView, null),
    archiveSprintSheet: pick(config.archiveSprintSheet, false),
    sprintRoundingStep: pick(config.sprintRoundingStep, 0),
    sprintRoundingMode: pick(config.sprintRoundingMode, 'nearest'),
    preferCategoryDescriptionAsPrimary: pick(config.preferCategoryDescriptionAsPrimary, false),
  }
}

export function resolveAppConfig(config: AppConfig | undefined): ResolvedAppConfig {
  return resolveDefinedConfig(config ?? DEFAULT_APP_CONFIG)
}

/**
 * The loaded config, or a thrown error.
 *
 * A mutation that saves `{ ...config, field }` cannot run before the config query
 * has resolved: spreading `undefined` would persist a config with every other
 * field missing. Callers reach this only from a mutationFn, where the query has
 * already settled, so the throw is a guard and not a code path.
 */
export function requireConfig(config: AppConfig | undefined): AppConfig {
  if (!config) throw new Error('Cannot save: the app config has not loaded yet.')
  return config
}
