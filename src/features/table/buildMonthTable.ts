import type { DayType } from '../day'
import type { Day, MonthData } from '../../infra/repositories/types'
import { calculateWorkedHours, calculateProjectedWorkedHours } from '../../shared/worktime'
import { calculateDayCategoryHours, UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { type WeekdayHours, DEFAULT_WEEKDAY_HOURS, targetHoursForDate } from '../../shared/weekdayHours'
import { resolveAutoCategory } from '../../shared/autoCategory'

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
}

function padDay(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function classifyWeekday(year: number, month: number, day: number): DayType {
  const dow = new Date(year, month - 1, day).getDay()
  return dow === 0 || dow === 6 ? 'Weekend' : 'WorkDay'
}

type BaseRow = Omit<MonthTableRow, 'accumulatedOvertime'>

function buildDayRow(
  date: string,
  day: number,
  year: number,
  month: number,
  dayData: Day | undefined,
  dayTypes: Map<string, DayType>,
  weekdayHours: WeekdayHours,
  globalAutoCategory: string | null,
  now?: string,
): BaseRow {
  const workedHours = calculateWorkedHours(dayData?.windows ?? [], now)
  const categoryHours = calculateDayCategoryHours(dayData ?? { windows: [] }, date, weekdayHours, now)
  const uncategorizedHours = categoryHours[UNCATEGORIZED_CATEGORY] ?? 0
  const entries: Record<string, number> = Object.fromEntries(
    Object.entries(categoryHours).filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY),
  )
  const hasUnaccountedHours = uncategorizedHours > 0.001
  const dayType = dayData?.dayTypeOverride ?? dayTypes.get(date) ?? classifyWeekday(year, month, day)
  return {
    date,
    dayType,
    workedHours,
    entries,
    autoCategoryHours: uncategorizedHours,
    resolvedAutoCategory: resolveAutoCategory(dayData?.autoCategoryOverride, globalAutoCategory),
    isEntriesBalanced: workedHours > 0 && uncategorizedHours < 0.01,
    hasUnaccountedHours,
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
  } = input
  const totalDays = new Date(year, month, 0).getDate()
  const baseRows: BaseRow[] = []
  for (let d = 1; d <= totalDays; d++) {
    const date = padDay(year, month, d)
    const now = date === today ? todayNow : undefined
    baseRows.push(buildDayRow(date, d, year, month, monthData[date], dayTypes, weekdayHours, globalAutoCategory, now))
  }

  // Single running accumulator instead of recomputing the cumulative total from
  // day 1 for every row (that was O(n²) over the month).
  let cumWorked = 0
  let cumTarget = 0
  return baseRows.map((base) => {
    if (base.date > today) return { ...base, accumulatedOvertime: null }

    const target = targetHoursForDate(base.date, weekdayHours)
    // For today, include the still-to-come portion of a planned-stop period so
    // the running total reflects the full planned day, not just elapsed time.
    const effectiveHours =
      base.date === today && todayNow !== undefined
        ? calculateProjectedWorkedHours(monthData[base.date]?.windows ?? [], todayNow)
        : base.workedHours

    if (effectiveHours > 0) {
      cumWorked += effectiveHours
      cumTarget += target
    }

    return { ...base, accumulatedOvertime: cumWorked - cumTarget }
  })
}
