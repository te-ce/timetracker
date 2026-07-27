import type {
  AppConfig,
  Day,
  MonthData,
  WorkLocation,
  WorkPeriod,
  DayTypeOverride,
} from '../../infra/repositories/types'
import type { DayType } from './dayType'
import type { DayStatus } from '../../shared/dayStatus'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { buildMonthSummaries, type DaySummary } from '../month/daySummary'
import { calculateOvertimeToDate, type OvertimeToDate } from '../../shared/overtime'
import { calculateTotalCategorizedHours } from '../../shared/periodCategories'
import { targetHoursForDate } from '../../shared/weekdayHours'
import { resolveAutoCategory } from '../../shared/autoCategory'

export interface DayRawData {
  windows: WorkPeriod[]
  workLocation: WorkLocation | null
  autoCategoryOverride: string | null
  dayTypeOverride: DayTypeOverride | undefined
  isConfirmed: boolean
  dayNote: string | null
}

export interface DayConfigContext {
  sollstunden: number
  defaultWorkLocation: WorkLocation
  effectiveLocation: WorkLocation
  autoCategory: string | null
}

export interface DayComputedStats {
  workedHours: number
  manualTotal: number
  overtimeToDate: OvertimeToDate
  selectedDayType: DayType
  isEntriesBalanced: boolean
  dayClassification: { displayStatus: Exclude<DayStatus, 'today'>; reason: string }
  officeDays: number
  totalWorkDays: number
  officePercent: number
}

export interface DayContext extends DayRawData, DayConfigContext, DayComputedStats {
  todayIso: string
}

const EMPTY_DAY: Day = { windows: [] }

const FUTURE_SUMMARY: DaySummary = {
  date: '',
  dayType: 'WorkDay',
  workedHours: 0,
  entryTotal: 0,
  isEntriesBalanced: false,
  isConfirmed: false,
  dayStatus: 'future',
  displayStatus: 'future',
  statusReason: '',
  categoryBreakdown: {},
}

function extractDayFields(dayData: Day | undefined): DayRawData {
  const day = dayData ?? EMPTY_DAY
  return {
    windows: day.windows,
    workLocation: day.location ?? null,
    autoCategoryOverride: day.autoCategoryOverride ?? null,
    dayTypeOverride: day.dayTypeOverride,
    isConfirmed: day.confirmed ?? false,
    dayNote: day.note ?? null,
  }
}

function resolveConfigDefaults(config: AppConfig | undefined, date: string) {
  const weekdayHours = config?.weekdayHours ?? DEFAULT_APP_CONFIG.weekdayHours
  return {
    sollstunden: targetHoursForDate(date, weekdayHours),
    weekdayHours,
    defaultWorkLocation: config?.defaultWorkLocation ?? 'Remote',
    globalAutoCategory: config?.autoCategory ?? null,
  }
}

function fromDaySummary(
  s: DaySummary,
): Omit<DayComputedStats, 'overtimeToDate' | 'manualTotal' | 'officeDays' | 'totalWorkDays' | 'officePercent'> {
  return {
    dayClassification: { displayStatus: s.displayStatus, reason: s.statusReason },
    workedHours: s.workedHours,
    selectedDayType: s.dayType,
    isEntriesBalanced: s.isEntriesBalanced,
  }
}

function calcOfficeStats(
  monthDays: DaySummary[],
  monthData: MonthData,
): { officeDays: number; totalWorkDays: number; officePercent: number } {
  const trackedWorkDays = monthDays.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => monthData[d.date]?.location === 'Office').length
  const totalWorkDays = trackedWorkDays.length
  const officePercent = totalWorkDays > 0 ? Math.round((officeDays / totalWorkDays) * 100) : 0
  return { officeDays, totalWorkDays, officePercent }
}

export function composeDayContext(
  date: string,
  monthData: MonthData,
  config: AppConfig | undefined,
  todayIso: string,
  todayNow?: string,
): DayContext {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))

  const {
    days: monthDays,
    workedHoursPerDay,
    projectedWorkedHoursToday,
  } = buildMonthSummaries(year, month, {
    monthData,
    today: todayIso,
    globalAutoCategory: config?.autoCategory ?? null,
    ...(todayNow !== undefined ? { todayNow } : {}),
  })

  const dayData = monthData[date]
  const daySummary = monthDays.find((d) => d.date === date) ?? FUTURE_SUMMARY

  const { sollstunden, weekdayHours, defaultWorkLocation, globalAutoCategory } = resolveConfigDefaults(config, date)
  const effectiveLocation: WorkLocation = dayData?.location ?? defaultWorkLocation
  const autoCategory = resolveAutoCategory(dayData?.autoCategoryOverride, globalAutoCategory)
  const targetHoursPerDay = monthDays.map((d) => targetHoursForDate(d.date, weekdayHours))
  const overtimeToDate = calculateOvertimeToDate(
    workedHoursPerDay,
    monthDays.map((d) => d.date),
    todayIso,
    targetHoursPerDay,
    projectedWorkedHoursToday,
  )
  const manualTotal = calculateTotalCategorizedHours(dayData?.windows ?? [])

  return {
    todayIso,
    ...extractDayFields(dayData),
    sollstunden,
    defaultWorkLocation,
    effectiveLocation,
    autoCategory,
    overtimeToDate,
    manualTotal,
    ...fromDaySummary(daySummary),
    ...calcOfficeStats(monthDays, monthData),
  }
}
