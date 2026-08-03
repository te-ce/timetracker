import type { MonthData } from '../infra/repositories/types'
import { buildMonthSummaries, type MonthSummaryResult } from '../features/month/daySummary'
import { calculateOvertimeToDate, type OvertimeToDate } from './overtime'
import type { ResolvedAppConfig } from './appConfigDefaults'
import { targetHoursForDate } from './weekdayHours'

export interface MonthOvertimeResult {
  summaries: MonthSummaryResult
  targetHoursPerDay: number[]
  overtimeToDate: OvertimeToDate
}

/**
 * Composes a month's DaySummaries with the cumulative overtime-to-date for
 * `todayIso`. Shared by the Day view (which needs one day's slice plus the
 * month for office-day stats) and the Month view (which needs the whole grid)
 * so both derive WorkedHours/overtime from the same pipeline.
 */
export function composeMonthOvertime(
  year: number,
  month: number,
  monthData: MonthData,
  config: ResolvedAppConfig,
  todayIso: string,
  todayNow?: string,
): MonthOvertimeResult {
  const weekdayHours = config.weekdayHours
  const summaries = buildMonthSummaries(year, month, {
    monthData,
    today: todayIso,
    globalAutoCategory: config.autoCategory,
    weekdayHours,
    ...(todayNow !== undefined ? { todayNow } : {}),
  })
  const targetHoursPerDay = summaries.days.map((d) => targetHoursForDate(d.date, weekdayHours))
  const overtimeToDate = calculateOvertimeToDate(
    summaries.workedHoursPerDay,
    summaries.days.map((d) => d.date),
    todayIso,
    targetHoursPerDay,
    summaries.projectedWorkedHoursToday,
  )
  return { summaries, targetHoursPerDay, overtimeToDate }
}
