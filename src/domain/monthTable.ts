import type { DayType } from './dayType'
import type { Day, MonthData } from '../repositories/types'
import { calculateWorkedHours } from './worktime'
import { calculateCategoryHours, UNCATEGORIZED_CATEGORY } from './periodCategories'

export interface MonthTableRow {
  date: string
  dayType: DayType
  workedHours: number
  entries: Record<string, number>
  autoCategoryHours: number
  autoCategoryOverride: number | null
  hasUnaccountedHours: boolean
}

export interface MonthTableInput {
  year: number
  month: number
  monthData: MonthData
  dayTypes: Map<string, DayType>
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

function buildDayRow(
  date: string,
  day: number,
  year: number,
  month: number,
  dayData: Day | undefined,
  dayTypes: Map<string, DayType>,
): MonthTableRow {
  const workedHours = calculateWorkedHours(dayData?.windows ?? [])
  const categoryHours = calculateCategoryHours(dayData?.windows ?? [])
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
  const { year, month, monthData, dayTypes } = input
  const totalDays = new Date(year, month, 0).getDate()
  const rows: MonthTableRow[] = []
  for (let d = 1; d <= totalDays; d++) {
    const date = padDay(year, month, d)
    rows.push(buildDayRow(date, d, year, month, monthData[date], dayTypes))
  }
  return rows
}
