import type { Day, MonthData } from '../infra/repositories/types'
import type { DayType } from '../features/day/dayType'
import { classifyDayType } from '../features/day/dayType'
import { calculateWorkedHours, calculateProjectedWorkedHours } from './worktime'
import { calculateDayCategoryHours, UNCATEGORIZED_CATEGORY } from './periodCategories'
import { toLocalIso } from './dateUtils'
import { effectiveTargetHours, type WeekdayHours } from './weekdayHours'
import type { LeaveType } from '../infra/repositories/types'

export interface MonthDayCore {
  date: string
  dayType: DayType
  workedHours: number
  /** The day's target hours, halved when `halfDayLeave` is set. */
  targetHours: number
  categoryHours: Record<string, number>
  entryTotal: number
  uncategorizedHours: number
  halfDayLeave?: LeaveType
}

export interface DeriveMonthDaysInput {
  year: number
  month: number
  monthData: MonthData
  weekdayHours: WeekdayHours
  today: string
  todayNow?: string
  /** External day-type source consulted when a day carries no dayTypeOverride of its own. */
  dayTypes?: Map<string, DayType>
}

export interface MonthDayCoreResult {
  days: MonthDayCore[]
  /** Today's projected worked hours (still-to-come portion of a planned-stop period included), if `todayNow` was given. */
  projectedWorkedHoursToday: number | undefined
}

function resolveNow(iso: string, today: string, todayNow: string | undefined): string | undefined {
  if (iso === today) return todayNow
  // Past days with an unclosed WorkPeriod are capped at end-of-day rather than
  // contributing zero duration for the open period.
  return iso < today ? '23:59' : undefined
}

function deriveDayCore(
  iso: string,
  date: Date,
  dayData: Day | undefined,
  weekdayHours: WeekdayHours,
  now: string | undefined,
  dayTypes: Map<string, DayType> | undefined,
): MonthDayCore {
  const windows = dayData?.windows ?? []
  const workedHours = calculateWorkedHours(windows, now)
  const halfDayLeave = dayData?.halfDayLeave
  const categoryHours = calculateDayCategoryHours(dayData ?? { windows: [] }, iso, weekdayHours, now)
  const entryTotal = Object.entries(categoryHours)
    .filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY)
    .reduce((sum, [, h]) => sum + h, 0)
  const uncategorizedHours = categoryHours[UNCATEGORIZED_CATEGORY] ?? 0
  const dayType: DayType = dayData?.dayTypeOverride ?? dayTypes?.get(iso) ?? classifyDayType(date)
  const targetHours = effectiveTargetHours(date, weekdayHours, halfDayLeave)

  return {
    date: iso,
    dayType,
    workedHours,
    targetHours,
    categoryHours,
    entryTotal,
    uncategorizedHours,
    ...(halfDayLeave !== undefined ? { halfDayLeave } : {}),
  }
}

/**
 * Derives the per-day facts shared by MonthView and TableView — day type,
 * WorkedHours, category breakdown, and balance — from one day-loop so both
 * views agree on day classification and stay in sync with future changes.
 */
export function deriveMonthDayCores(input: DeriveMonthDaysInput): MonthDayCoreResult {
  const { year, month, monthData, weekdayHours, today, todayNow, dayTypes } = input
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: MonthDayCore[] = []
  let projectedWorkedHoursToday: number | undefined

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const iso = toLocalIso(date)
    const now = resolveNow(iso, today, todayNow)
    const core = deriveDayCore(iso, date, monthData[iso], weekdayHours, now, dayTypes)
    days.push(core)
    if (iso === today) {
      projectedWorkedHoursToday =
        now !== undefined ? calculateProjectedWorkedHours(monthData[iso]?.windows ?? [], now) : undefined
    }
  }

  return { days, projectedWorkedHoursToday }
}
