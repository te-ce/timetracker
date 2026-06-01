import type { DayType } from './dayType'
import type { Day, MonthData } from '../repositories/types'
import { calculateWorkedHours } from './worktime'

export interface MonthGridRow {
  date: string
  dayType: DayType
  workedHours: number
  entries: Record<string, number>
  autoCategoryHours: number
  autoCategoryOverride: number | null
  hasUnaccountedHours: boolean
}

export interface MonthGridInput {
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

function aggregateEntries(dayData: Day | undefined): { entries: Record<string, number>; manualTotal: number } {
  const entries: Record<string, number> = {}
  let manualTotal = 0
  for (const e of dayData?.entries ?? []) {
    entries[e.category] = (entries[e.category] ?? 0) + e.hours
    manualTotal += e.hours
  }
  return { entries, manualTotal }
}

function buildDayRow(date: string, day: number, year: number, month: number, dayData: Day | undefined, dayTypes: Map<string, DayType>): MonthGridRow {
  const workedHours = calculateWorkedHours(dayData?.windows ?? [])
  const { entries, manualTotal } = aggregateEntries(dayData)
  const autoCategoryHours = Math.max(0, workedHours - manualTotal)
  const hasUnaccountedHours = workedHours > 0 && (manualTotal + autoCategoryHours) < workedHours
  const dayType = dayData?.dayTypeOverride ?? dayTypes.get(date) ?? classifyWeekday(year, month, day)
  return { date, dayType, workedHours, entries, autoCategoryHours, autoCategoryOverride: null, hasUnaccountedHours }
}

export function buildMonthGrid(input: MonthGridInput): MonthGridRow[] {
  const { year, month, monthData, dayTypes } = input
  const totalDays = new Date(year, month, 0).getDate()
  const rows: MonthGridRow[] = []
  for (let d = 1; d <= totalDays; d++) {
    const date = padDay(year, month, d)
    rows.push(buildDayRow(date, d, year, month, monthData[date], dayTypes))
  }
  return rows
}
