import type { DayType } from './dayType'
import type { DayStatus } from './dayStatus'
import type { MonthData, Day } from '../repositories/types'
import { classifyDay } from './dayStatus'
import { classifyDayType } from './dayType'
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

function unpackDay(dayData: Day | undefined, globalAutoCategory: string | null) {
  const windows = dayData?.windows ?? []
  const entries = dayData?.entries ?? []
  const dayTypeOverride = dayData?.dayTypeOverride
  const autoCategory = dayData?.autoCategoryOverride ?? globalAutoCategory
  const isConfirmed = dayData?.confirmed ?? false
  return { windows, entries, dayTypeOverride, autoCategory, isConfirmed }
}

function buildDaySummary(
  iso: string,
  date: Date,
  dayData: Day | undefined,
  globalAutoCategory: string | null,
  today: string,
): DaySummary & { isWorkDay: boolean } {
  const { windows, entries, dayTypeOverride, autoCategory, isConfirmed } = unpackDay(dayData, globalAutoCategory)
  const workedHours = calculateWorkedHours(windows)
  const entryTotal = entries.reduce((sum, e) => sum + e.hours, 0)
  const dayType: DayType = dayTypeOverride ?? classifyDayType(date)
  const hasAutoCategory = !!autoCategory && entryTotal <= workedHours
  const isEntriesBalanced = workedHours > 0 && Math.abs(workedHours - entryTotal) < 0.01

  const { status: dayStatus, displayStatus, reason: statusReason } = classifyDay({
    dayType, workedHours, manualTotal: entryTotal, isEntriesBalanced, hasAutoCategory, isConfirmed, isoDate: iso, today,
  })

  return { date: iso, dayType, workedHours, entryTotal, isEntriesBalanced, hasAutoCategory, dayStatus, displayStatus, statusReason, isWorkDay: dayType === 'WorkDay' }
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
    const summary = buildDaySummary(iso, date, monthData[iso], globalAutoCategory, today)
    if (summary.isWorkDay) workDayCount++
    workedHoursPerDay.push(summary.workedHours)
    days.push({ date: summary.date, dayType: summary.dayType, workedHours: summary.workedHours, entryTotal: summary.entryTotal, isEntriesBalanced: summary.isEntriesBalanced, hasAutoCategory: summary.hasAutoCategory, dayStatus: summary.dayStatus, displayStatus: summary.displayStatus, statusReason: summary.statusReason })
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)
  return { days, workDayCount, workedHoursPerDay, hasAnyTrackedHours }
}
