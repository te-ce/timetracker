import type { DayType } from '../day/dayType'
import type { DayStatus } from '../../shared/dayStatus'
import type { MonthData, Day } from '../../infra/repositories/types'
import { classifyDay } from '../../shared/dayStatus'
import { classifyDayType } from '../day/dayType'
import { calculateWorkedHours } from '../../shared/worktime'
import { calculateCategoryHours, UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { toLocalIso } from '../../shared/dateUtils'

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
  categoryBreakdown: Record<string, number>
  leaveType?: 'Vacation' | 'SickDay'
}

export interface MonthSummaryInput {
  monthData: MonthData
  today: string
  globalAutoCategory?: string | null
  todayNow?: string
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

function buildDaySummary(iso: string, date: Date, dayData: Day | undefined, today: string, now?: string): DaySummary {
  const { windows, dayTypeOverride, isConfirmed } = unpackDay(dayData)
  const workedHours = calculateWorkedHours(windows, now)
  const categoryHours = calculateCategoryHours(windows, now)
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
    leaveType,
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

  const categoryBreakdown = Object.fromEntries(
    Object.entries(categoryHours).filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY),
  )

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
    categoryBreakdown,
    ...(leaveType !== undefined ? { leaveType } : {}),
  }
}

export function buildMonthSummaries(year: number, month: number, input: MonthSummaryInput): MonthSummaryResult {
  const { monthData, today, todayNow } = input
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: DaySummary[] = []
  const workedHoursPerDay: number[] = []
  let workDayCount = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const iso = toLocalIso(date)
    const now = iso === today ? todayNow : iso < today ? '23:59' : undefined
    const summary = buildDaySummary(iso, date, monthData[iso], today, now)
    if (summary.dayType === 'WorkDay') workDayCount++
    workedHoursPerDay.push(summary.workedHours)
    days.push(summary)
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)
  return { days, workDayCount, workedHoursPerDay, hasAnyTrackedHours }
}
