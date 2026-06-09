import type { DayType } from '../day'
import type { Day, MonthData } from '../../infra/repositories/types'
import { calculateWorkedHours } from '../../shared/worktime'
import { calculateCategoryHours, UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { type WeekdayHours, DEFAULT_WEEKDAY_HOURS } from '../../shared/weekdayHours'

export interface MonthTableRow {
  date: string
  dayType: DayType
  workedHours: number
  entries: Record<string, number>
  autoCategoryHours: number
  autoCategoryOverride: number | null
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
  now?: string,
): BaseRow {
  const workedHours = calculateWorkedHours(dayData?.windows ?? [], now)
  const categoryHours = calculateCategoryHours(dayData?.windows ?? [], now)
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
    autoCategoryOverride: null,
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
  } = input
  const totalDays = new Date(year, month, 0).getDate()
  const rows: MonthTableRow[] = []
  let runningOvertime = 0
  for (let d = 1; d <= totalDays; d++) {
    const date = padDay(year, month, d)
    const now = date === today ? todayNow : undefined
    const base = buildDayRow(date, d, year, month, monthData[date], dayTypes, now)
    if (date > today) {
      rows.push({ ...base, accumulatedOvertime: null })
    } else {
      if (base.workedHours > 0) {
        const target = base.dayType === 'WorkDay' ? (weekdayHours[new Date(year, month - 1, d).getDay()] ?? 0) : 0
        runningOvertime += base.workedHours - target
      }
      rows.push({ ...base, accumulatedOvertime: runningOvertime })
    }
  }
  return rows
}
