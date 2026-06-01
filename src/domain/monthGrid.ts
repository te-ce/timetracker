import type { DayType } from './dayType'
import type { MonthData } from '../repositories/types'
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

export function buildMonthGrid(input: MonthGridInput): MonthGridRow[] {
  const { year, month, monthData, dayTypes } = input
  const totalDays = new Date(year, month, 0).getDate()
  const rows: MonthGridRow[] = []

  for (let d = 1; d <= totalDays; d++) {
    const date = padDay(year, month, d)
    const dayData = monthData[date]
    const dayWindows = dayData?.windows ?? []
    const dayEntries = dayData?.entries ?? []

    const workedHours = calculateWorkedHours(dayWindows)
    const entries: Record<string, number> = {}
    let manualTotal = 0
    for (const e of dayEntries) {
      entries[e.category] = (entries[e.category] ?? 0) + e.hours
      manualTotal += e.hours
    }

    const autoCategoryManualValue = null
    const computedAuto = Math.max(0, workedHours - manualTotal)
    const autoCategoryHours = computedAuto
    const totalAccountedHours = manualTotal + autoCategoryHours
    const hasUnaccountedHours = workedHours > 0 && totalAccountedHours < workedHours

    rows.push({
      date,
      dayType: dayData?.dayTypeOverride ?? dayTypes.get(date) ?? classifyWeekday(year, month, d),
      workedHours,
      entries,
      autoCategoryHours,
      autoCategoryOverride: autoCategoryManualValue,
      hasUnaccountedHours,
    })
  }

  return rows
}
