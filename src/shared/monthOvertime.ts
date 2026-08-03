import type { MonthData, MonthRepository } from '../infra/repositories/types'
import { buildMonthSummaries, type MonthSummaryResult } from '../features/month/daySummary'
import { calculateOvertimeToDate, calculateMonthStats, type OvertimeToDate } from './overtime'
import { calculateOvertimeCarryOver } from './overtimeCarryOver'
import type { ResolvedAppConfig } from './appConfigDefaults'
import { targetHoursForDate, type WeekdayHours } from './weekdayHours'

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
 *
 * `priorMonthsOvertime` seeds the running total with everything carried in
 * from months before this one — see `loadOvertimeCarryOverBeforeMonth` —
 * so a new month doesn't reset the balance to zero.
 */
export function composeMonthOvertime(
  year: number,
  month: number,
  monthData: MonthData,
  config: ResolvedAppConfig,
  todayIso: string,
  todayNow?: string,
  priorMonthsOvertime = 0,
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
    priorMonthsOvertime,
  )
  return { summaries, targetHoursPerDay, overtimeToDate }
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** A completed month's net overtime — worked minus target, tracked days only. */
async function overtimeForCompletedMonth(
  monthRepo: MonthRepository,
  ym: string,
  weekdayHours: WeekdayHours,
): Promise<number> {
  const year = parseInt(ym.slice(0, 4))
  const month = parseInt(ym.slice(5, 7))
  const monthData = await monthRepo.getMonth(year, month)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextMonthYear = month === 12 ? year + 1 : year
  const afterMonthEnd = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-01`
  const summaries = buildMonthSummaries(year, month, { monthData, today: afterMonthEnd, weekdayHours })
  const targetHoursPerDay = summaries.days.map((d) => targetHoursForDate(d.date, weekdayHours))
  return calculateMonthStats(summaries.workedHoursPerDay, targetHoursPerDay).overtime
}

/**
 * Cumulative overtime carried in from all months strictly before `year`/`month`.
 * Reads every earlier month's data via `monthRepo`, so cost grows with history
 * length — fine at today's scale, worth revisiting if it ever shows up in profiling.
 */
export async function loadOvertimeCarryOverBeforeMonth(
  monthRepo: MonthRepository,
  year: number,
  month: number,
  weekdayHours: WeekdayHours,
): Promise<number> {
  const targetMonth = monthKey(year, month)
  const allMonths = await monthRepo.getAllMonths()
  const priorMonths = allMonths.filter((ym) => ym < targetMonth)
  const monthlyOvertimes = await Promise.all(
    priorMonths.map(async (ym) => ({
      month: ym,
      overtime: await overtimeForCompletedMonth(monthRepo, ym, weekdayHours),
    })),
  )
  return calculateOvertimeCarryOver({
    initialOvertime: 0,
    monthlyOvertimes,
    manualOverrides: new Map(),
    targetMonth,
  }).value
}
