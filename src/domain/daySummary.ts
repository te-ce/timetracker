import type { DayType } from './dayType'
import type { DayStatus } from './dayStatus'
import type { TimeEntry, WorkWindow } from '../repositories/types'
import type { DayTypeOverride } from '../repositories/types'
import { classifyDay } from './dayType'
import { calculateWorkedHours } from './worktime'
import { getDayStatus } from './dayStatus'
import { toLocalIso } from './dateUtils'

export interface DaySummary {
  date: string
  dayType: DayType
  workedHours: number
  entryTotal: number
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  dayStatus: DayStatus
}

export interface MonthSummaryInput {
  windows: WorkWindow[]
  entries: TimeEntry[]
  dayTypeOverrides: Map<string, DayTypeOverride>
  today: string
  globalAutoCategory?: string | null
  autoCategoryOverrides?: Map<string, string>
}

export interface MonthSummaryResult {
  days: DaySummary[]
  workDayCount: number
  workedHoursPerDay: number[]
  hasAnyTrackedHours: boolean
}

export function buildMonthSummaries(year: number, month: number, input: MonthSummaryInput): MonthSummaryResult {
  const { windows, entries, dayTypeOverrides, today, globalAutoCategory = null, autoCategoryOverrides = new Map() } = input
  const daysInMonth = new Date(year, month, 0).getDate()

  // Group by date for efficient lookup
  const windowsByDate = new Map<string, WorkWindow[]>()
  for (const w of windows) {
    const list = windowsByDate.get(w.date) ?? []
    list.push(w)
    windowsByDate.set(w.date, list)
  }

  const entriesByDate = new Map<string, TimeEntry[]>()
  for (const e of entries) {
    const list = entriesByDate.get(e.date) ?? []
    list.push(e)
    entriesByDate.set(e.date, list)
  }

  const days: DaySummary[] = []
  const workedHoursPerDay: number[] = []
  let workDayCount = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const iso = toLocalIso(date)
    const dayWindows = windowsByDate.get(iso) ?? []
    const dayEntries = entriesByDate.get(iso) ?? []

    const workedHours = calculateWorkedHours(dayWindows)
    const entryTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0)
    const override = dayTypeOverrides.get(iso)
    const dayType: DayType = override ?? classifyDay(date)

    if (dayType === 'WorkDay') workDayCount++
    workedHoursPerDay.push(workedHours)

    const hasAutoCategory = !!(autoCategoryOverrides.get(iso) ?? globalAutoCategory)

    const dayStatus = getDayStatus({
      dayType,
      hasWorkedHours: workedHours > 0,
      isEntriesBalanced: workedHours > 0 && Math.abs(workedHours - entryTotal) < 0.01,
      hasAutoCategory,
      isoDate: iso,
      today,
    })

    days.push({
      date: iso,
      dayType,
      workedHours,
      entryTotal,
      isEntriesBalanced: workedHours > 0 && Math.abs(workedHours - entryTotal) < 0.01,
      hasAutoCategory,
      dayStatus,
    })
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)

  return { days, workDayCount, workedHoursPerDay, hasAnyTrackedHours }
}
