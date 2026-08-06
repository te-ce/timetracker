import type { DayType } from '../day'
import type { MonthData } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { type WeekdayHours, DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'
import { resolveAutoCategory } from '../../shared/autoCategory'
import { calculateCumulativeOvertime } from '../../shared/overtime'
import { deriveMonthDayCores, type MonthDayCore } from '../../shared/monthDayCore'

export interface MonthTableRow {
  date: string
  dayType: DayType
  workedHours: number
  /** The day's target hours, halved when flagged as a half-day leave. */
  targetHours: number
  entries: Record<string, number>
  autoCategoryHours: number
  /** AutoCategory resolved for this day: per-day override (ADR 0004) falling back to the global default. */
  resolvedAutoCategory: string | null
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
  /** False while `priorMonthsOvertime` is still loading — nulls out every row's `accumulatedOvertime` rather than showing a value seeded from a not-yet-resolved carry-over. */
  overtimeReady?: boolean
}

/** A category cell's displayed hours: the manual entry, plus AutoCategory's remainder hours (ADR 0004) when this category is the row's resolved auto category. */
export function categoryHoursIncludingAuto(
  row: Pick<MonthTableRow, 'entries' | 'resolvedAutoCategory' | 'autoCategoryHours'>,
  category: string,
): number {
  const manual = row.entries[category] ?? 0
  const autoHours = category === row.resolvedAutoCategory ? row.autoCategoryHours : 0
  return manual + autoHours
}

/** The row's manual entries plus AutoCategory's remainder hours (ADR 0004) folded into the resolved auto category, for display as one breakdown. */
export function categoryBreakdownWithAuto(
  row: Pick<MonthTableRow, 'entries' | 'resolvedAutoCategory' | 'autoCategoryHours'>,
): Record<string, number> {
  const breakdown: Record<string, number> = { ...row.entries }
  if (row.resolvedAutoCategory && row.autoCategoryHours > 0.001) {
    breakdown[row.resolvedAutoCategory] = (breakdown[row.resolvedAutoCategory] ?? 0) + row.autoCategoryHours
  }
  return breakdown
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
    targetHours: core.targetHours,
    entries: Object.fromEntries(Object.entries(core.categoryHours).filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY)),
    autoCategoryHours: core.uncategorizedHours,
    resolvedAutoCategory: resolveAutoCategory(autoCategoryOverride, globalAutoCategory),
  }
}

export interface TableRowsFromCoresInput {
  monthData: MonthData
  weekdayHours?: WeekdayHours
  today?: string
  globalAutoCategory?: string | null
  priorMonthsOvertime?: number
  overtimeReady?: boolean
  projectedWorkedHoursToday: number | undefined
}

/** Builds table rows from cores already derived by `deriveMonthDayCores` — callers holding more than one month-derived view (see `buildMonthView`) share one day-loop instead of each deriving cores themselves. */
export function tableRowsFromCores(cores: MonthDayCore[], input: TableRowsFromCoresInput): MonthTableRow[] {
  const {
    monthData,
    today = '9999-12-31',
    globalAutoCategory = null,
    priorMonthsOvertime = 0,
    overtimeReady = true,
    projectedWorkedHoursToday,
  } = input

  const baseRows = cores.map((core) =>
    buildDayRow(core, monthData[core.date]?.autoCategoryOverride, globalAutoCategory),
  )

  const dates = baseRows.map((r) => r.date)
  const targetHoursPerDay = baseRows.map((r) => r.targetHours)
  const workedHoursPerDay = baseRows.map((r) => r.workedHours)
  const accumulatedOvertime = calculateCumulativeOvertime(
    workedHoursPerDay,
    dates,
    targetHoursPerDay,
    today,
    projectedWorkedHoursToday,
    priorMonthsOvertime,
  )

  return baseRows.map((base, i) => ({
    ...base,
    accumulatedOvertime: overtimeReady ? (accumulatedOvertime[i] ?? null) : null,
  }))
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
    overtimeReady = true,
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

  return tableRowsFromCores(cores, {
    monthData,
    weekdayHours,
    today,
    globalAutoCategory,
    priorMonthsOvertime,
    overtimeReady,
    projectedWorkedHoursToday,
  })
}
