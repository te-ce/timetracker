import type { DayType } from './dayType'
import type { DayStatus } from './dayStatus'
import type { MonthData, Day } from '../repositories/types'
import { classifyDay } from './dayStatus'
import { classifyDayType } from './dayType'
import { calculateWorkedHours } from './worktime'
import { calculateCategoryHours, UNCATEGORIZED_CATEGORY } from './periodCategories'
import { toLocalIso } from './dateUtils'

export interface DaySummary {
  date: string
  dayType: DayType
  workedHours: number
  entryTotal: number
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isConfirmed: boolean
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

function unpackDay(dayData: Day | undefined) {
  const windows = dayData?.windows ?? []
  const dayTypeOverride = dayData?.dayTypeOverride
  const isConfirmed = dayData?.confirmed ?? false
  return { windows, dayTypeOverride, isConfirmed }
}

function buildDaySummary(iso: string, date: Date, dayData: Day | undefined, today: string): DaySummary {
  const { windows, dayTypeOverride, isConfirmed } = unpackDay(dayData)
  const workedHours = calculateWorkedHours(windows)
  const categoryHours = calculateCategoryHours(windows)
  const entryTotal = Object.entries(categoryHours)
    .filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY)
    .reduce((sum, [, h]) => sum + h, 0)
  const uncategorizedHours = categoryHours[UNCATEGORIZED_CATEGORY] ?? 0
  const dayType: DayType = dayTypeOverride ?? classifyDayType(date)
  const isEntriesBalanced = workedHours > 0 && uncategorizedHours < 0.01
  const hasAutoCategory = false

  const {
    status: dayStatus,
    displayStatus,
    reason: statusReason,
  } = classifyDay({
    dayType,
    workedHours,
    manualTotal: entryTotal,
    isEntriesBalanced,
    hasAutoCategory,
    isConfirmed,
    isoDate: iso,
    today,
  })

  return {
    date: iso,
    dayType,
    workedHours,
    entryTotal,
    isEntriesBalanced,
    hasAutoCategory,
    isConfirmed,
    dayStatus,
    displayStatus,
    statusReason,
  }
}

export function buildMonthSummaries(year: number, month: number, input: MonthSummaryInput): MonthSummaryResult {
  const { monthData, today } = input
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: DaySummary[] = []
  const workedHoursPerDay: number[] = []
  let workDayCount = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const iso = toLocalIso(date)
    const summary = buildDaySummary(iso, date, monthData[iso], today)
    if (summary.dayType === 'WorkDay') workDayCount++
    workedHoursPerDay.push(summary.workedHours)
    days.push(summary)
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)
  return { days, workDayCount, workedHoursPerDay, hasAnyTrackedHours }
}
