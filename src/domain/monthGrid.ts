import type { DayType } from './dayType'
import type { TimeEntry, WorkPeriod } from '../repositories/types'
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
  timeEntries: TimeEntry[]
  workPeriods: WorkPeriod[]
  dayTypes: Map<string, DayType>
  autoCategory: string
  autoCategoryOverrides: Map<string, string>
  autoCategoryManualValues?: Map<string, number>
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
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
  dayWindows: WorkPeriod[],
  dayEntries: TimeEntry[],
  input: MonthGridInput,
): MonthGridRow {
  const workedHours = calculateWorkedHours(dayWindows)
  const entries: Record<string, number> = {}
  let manualTotal = 0
  for (const e of dayEntries) {
    entries[e.category] = (entries[e.category] ?? 0) + e.hours
    manualTotal += e.hours
  }
  const dateParts = date.split('-').map(Number)
  const year = dateParts[0] ?? 0
  const month = dateParts[1] ?? 0
  const day = dateParts[2] ?? 0
  const autoCategoryManualValue = input.autoCategoryManualValues?.get(date) ?? null
  const computedAuto = Math.max(0, workedHours - manualTotal)
  const autoCategoryHours = autoCategoryManualValue ?? computedAuto
  const totalAccountedHours = manualTotal + autoCategoryHours
  const hasUnaccountedHours = workedHours > 0 && totalAccountedHours < workedHours
  return {
    date,
    dayType: input.dayTypes.get(date) ?? classifyWeekday(year, month, day),
    workedHours,
    entries,
    autoCategoryHours,
    autoCategoryOverride: autoCategoryManualValue,
    hasUnaccountedHours,
  }
}

export function buildMonthGrid(input: MonthGridInput): MonthGridRow[] {
  const { year, month, workPeriods, timeEntries } = input
  const totalDays = daysInMonth(year, month)

  const windowsByDate = new Map<string, WorkPeriod[]>()
  for (const w of workPeriods) {
    const list = windowsByDate.get(w.date) ?? []
    list.push(w)
    windowsByDate.set(w.date, list)
  }

  const entriesByDate = new Map<string, TimeEntry[]>()
  for (const e of timeEntries) {
    const list = entriesByDate.get(e.date) ?? []
    list.push(e)
    entriesByDate.set(e.date, list)
  }

  const rows: MonthGridRow[] = []

  for (let day = 1; day <= totalDays; day++) {
    const date = padDay(year, month, day)
    const dayWindows = windowsByDate.get(date) ?? []
    const dayEntries = entriesByDate.get(date) ?? []
    rows.push(buildDayRow(date, dayWindows, dayEntries, input))
  }

  return rows
}
