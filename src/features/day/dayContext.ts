import type { Day, MonthData, WorkLocation, WorkPeriod, DayTypeOverride } from '../../infra/repositories/types'
import type { DayType } from './dayType'
import type { DayStatus } from '../../shared/dayStatus'
import type { ResolvedAppConfig } from '../../shared/appConfigDefaults'
import type { DaySummary } from '../month/daySummary'
import { type OvertimeToDate } from '../../shared/overtime'
import { composeMonthOvertime } from '../../shared/monthOvertime'
import { calculateTotalCategorizedHours } from '../../shared/periodCategories'
import { officeStats } from '../../shared/officeStats'
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
  /** Today's WorkPeriods — empty when today is outside the viewed month. */
  todayWindows: WorkPeriod[]
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

function fromDaySummary(
  s: DaySummary,
): Omit<
  DayComputedStats,
  'overtimeToDate' | 'manualTotal' | 'officeDays' | 'totalWorkDays' | 'officePercent' | 'todayWindows'
> {
  return {
    dayClassification: { displayStatus: s.displayStatus, reason: s.statusReason },
    workedHours: s.workedHours,
    selectedDayType: s.dayType,
    isEntriesBalanced: s.isEntriesBalanced,
  }
}

export function composeDayContext(
  date: string,
  monthData: MonthData,
  config: ResolvedAppConfig,
  todayIso: string,
  todayNow?: string,
  priorMonthsOvertime = 0,
): DayContext {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))

  const {
    summaries: { days: monthDays },
    overtimeToDate,
  } = composeMonthOvertime(year, month, monthData, config, todayIso, todayNow, priorMonthsOvertime)

  const dayData = monthData[date]
  const daySummary = monthDays.find((d) => d.date === date) ?? FUTURE_SUMMARY

  const sollstunden = targetHoursForDate(date, config.weekdayHours)
  const effectiveLocation: WorkLocation = dayData?.location ?? config.defaultWorkLocation
  const autoCategory = resolveAutoCategory(dayData?.autoCategoryOverride, config.autoCategory)
  const manualTotal = calculateTotalCategorizedHours(dayData?.windows ?? [])

  return {
    todayIso,
    ...extractDayFields(dayData),
    sollstunden,
    defaultWorkLocation: config.defaultWorkLocation,
    effectiveLocation,
    autoCategory,
    overtimeToDate,
    manualTotal,
    todayWindows: monthData[todayIso]?.windows ?? [],
    ...fromDaySummary(daySummary),
    ...officeStats(monthDays, (d) => monthData[d]?.location),
  }
}
