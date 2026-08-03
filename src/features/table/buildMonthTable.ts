import type { DayType } from '../day'
import type { MonthData } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { type WeekdayHours, DEFAULT_WEEKDAY_HOURS, targetHoursForDate } from '../../shared/weekdayHours'
import { resolveAutoCategory } from '../../shared/autoCategory'
import { calculateCumulativeOvertime } from '../../shared/overtime'
import { deriveMonthDayCores, type MonthDayCore } from '../../shared/monthDayCore'

export interface MonthTableRow {
  date: string
  dayType: DayType
  workedHours: number
  entries: Record<string, number>
  autoCategoryHours: number
  /** AutoCategory resolved for this day: per-day override (ADR 0004) falling back to the global default. */
  resolvedAutoCategory: string | null
  isEntriesBalanced: boolean
  hasUnaccountedHours: boolean
  /** Running over/undertime total up to this date. null for future dates. */
  accumulatedOvertime: number | null
}

export interface MonthTableInput {
  year: number
  month: number
  monthData: MonthData
  dayTypes: Map<string, DayType>
  weekdayHours?: WeekdayHours
  today?: string
  /** Current HH:MM time — passed to today's row so open periods count as live. */
  todayNow?: string
  globalAutoCategory?: string | null
  /** Cumulative overtime carried in from months before this one — see `loadOvertimeCarryOverBeforeMonth`. */
  priorMonthsOvertime?: number
}

type BaseRow = Omit<MonthTableRow, 'accumulatedOvertime'>

function buildDayRow(
  core: MonthDayCore,
  autoCategoryOverride: string | undefined,
  globalAutoCategory: string | null,
): BaseRow {
  return {
    date: core.date,
    dayType: core.dayType,
    workedHours: core.workedHours,
    entries: Object.fromEntries(Object.entries(core.categoryHours).filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY)),
    autoCategoryHours: core.uncategorizedHours,
    resolvedAutoCategory: resolveAutoCategory(autoCategoryOverride, globalAutoCategory),
    isEntriesBalanced: core.isEntriesBalanced,
    hasUnaccountedHours: core.uncategorizedHours > 0.001,
  }
}

export function buildMonthTable(input: MonthTableInput): MonthTableRow[] {
  const {
    year,
    month,
    monthData,
    dayTypes,
    weekdayHours = DEFAULT_WEEKDAY_HOURS,
    today = '9999-12-31',
    todayNow,
    globalAutoCategory = null,
    priorMonthsOvertime = 0,
  } = input

  const { days: cores, projectedWorkedHoursToday } = deriveMonthDayCores({
    year,
    month,
    monthData,
    weekdayHours,
    today,
    dayTypes,
    ...(todayNow !== undefined ? { todayNow } : {}),
  })

  const baseRows = cores.map((core) =>
    buildDayRow(core, monthData[core.date]?.autoCategoryOverride, globalAutoCategory),
  )

  const dates = baseRows.map((r) => r.date)
  const targetHoursPerDay = dates.map((date) => targetHoursForDate(date, weekdayHours))
  const workedHoursPerDay = baseRows.map((r) => r.workedHours)
  const accumulatedOvertime = calculateCumulativeOvertime(
    workedHoursPerDay,
    dates,
    targetHoursPerDay,
    today,
    projectedWorkedHoursToday,
    priorMonthsOvertime,
  )

  return baseRows.map((base, i) => ({ ...base, accumulatedOvertime: accumulatedOvertime[i] ?? null }))
}
