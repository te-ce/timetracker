import type { Day, MonthData } from '../infra/repositories/types'
import type { DayType } from '../features/day/dayType'
import { classifyDayType } from '../features/day/dayType'
import { calculateWorkedHours, calculateProjectedWorkedHours, periodReviewReason } from './worktime'
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
  /** Why a past day's WorkPeriods can't be measured; such periods count 0 until fixed. */
  reviewReason?: string
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

// Only today has a clock to run against. A WorkPeriod left open on any other
// day counts 0 and flags the day for review instead of borrowing today's time.
function resolveNow(iso: string, today: string, todayNow: string | undefined): string | undefined {
  return iso === today ? todayNow : undefined
}

function resolveDayType(
  dayData: Day | undefined,
  date: Date,
  dayTypes: Map<string, DayType> | undefined,
  iso: string,
): DayType {
  return dayData?.dayTypeOverride ?? dayTypes?.get(iso) ?? classifyDayType(date)
}

// Weekend is left to weekdayHours so a configured Saturday target still applies.
const DAY_OFF_TYPES: ReadonlySet<DayType> = new Set(['PublicHoliday', 'Vacation', 'SickDay'])

function splitCategoryTotals(categoryHours: Record<string, number>): {
  entryTotal: number
  uncategorizedHours: number
} {
  const entryTotal = Object.entries(categoryHours)
    .filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY)
    .reduce((sum, [, h]) => sum + h, 0)
  const uncategorizedHours = categoryHours[UNCATEGORIZED_CATEGORY] ?? 0
  return { entryTotal, uncategorizedHours }
}

function deriveDayCore(
  iso: string,
  today: string,
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
  const { entryTotal, uncategorizedHours } = splitCategoryTotals(categoryHours)
  const dayType = resolveDayType(dayData, date, dayTypes, iso)
  const targetHours = DAY_OFF_TYPES.has(dayType) ? 0 : effectiveTargetHours(date, weekdayHours, halfDayLeave)
  const reviewReason = iso < today ? periodReviewReason(windows) : null

  return {
    date: iso,
    dayType,
    workedHours,
    targetHours,
    categoryHours,
    entryTotal,
    uncategorizedHours,
    ...(halfDayLeave !== undefined ? { halfDayLeave } : {}),
    ...(reviewReason !== null ? { reviewReason } : {}),
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
    const core = deriveDayCore(iso, today, date, monthData[iso], weekdayHours, now, dayTypes)
    days.push(core)
    if (iso === today) {
      projectedWorkedHoursToday =
        now !== undefined ? calculateProjectedWorkedHours(monthData[iso]?.windows ?? [], now) : undefined
    }
  }

  return { days, projectedWorkedHoursToday }
}
