import type { DayType } from './dayType'
import type { DayStatus } from './dayStatus'
import type { MonthData } from '../repositories/types'
import { classifyDay } from './dayStatus'
import { classifyDay as classifyDayType } from './dayType'
import { calculateWorkedHours } from './worktime'
import { toLocalIso } from './dateUtils'

export interface DaySummary {
  date: string
  dayType: DayType
  workedHours: number
  entryTotal: number
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  dayStatus: DayStatus
  displayStatus: Exclude<DayStatus, 'today'>
  statusReason: string
}

export interface MonthSummaryInput {
  monthData: MonthData
  today: string
  globalAutoCategory?: string | null
}

export interface MonthSummaryResult {
  days: DaySummary[]
  workDayCount: number
  workedHoursPerDay: number[]
  hasAnyTrackedHours: boolean
}

export function buildMonthSummaries(year: number, month: number, input: MonthSummaryInput): MonthSummaryResult {
  const { monthData, today, globalAutoCategory = null } = input
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: DaySummary[] = []
  const workedHoursPerDay: number[] = []
  let workDayCount = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const iso = toLocalIso(date)
    const dayData = monthData[iso]
    const dayWindows = dayData?.windows ?? []
    const dayEntries = dayData?.entries ?? []

    const workedHours = calculateWorkedHours(dayWindows)
    const entryTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0)
    const dayType: DayType = dayData?.dayTypeOverride ?? classifyDayType(date)
    const autoCategory = dayData?.autoCategoryOverride ?? globalAutoCategory
    const hasAutoCategory = !!autoCategory && entryTotal <= workedHours
    const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - entryTotal) < 0.01
    const isConfirmed = dayData?.confirmed ?? false

    const { status: dayStatus, displayStatus, reason: statusReason } = classifyDay({
      dayType,
      workedHours,
      manualTotal: entryTotal,
      isEntriesBalanced,
      hasAutoCategory,
      isConfirmed,
      isoDate: iso,
      today,
    })

    if (dayType === 'WorkDay') workDayCount++
    workedHoursPerDay.push(workedHours)
    days.push({ date: iso, dayType, workedHours, entryTotal, isEntriesBalanced, hasAutoCategory, dayStatus, displayStatus, statusReason })
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)
  return { days, workDayCount, workedHoursPerDay, hasAnyTrackedHours }
}
