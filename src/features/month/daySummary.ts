import type { DayType } from '../day/dayType'
import type { DayStatus } from '../../shared/dayStatus'
import type { MonthData } from '../../infra/repositories/types'
import { classifyDay } from '../../shared/dayStatus'
import { UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { DEFAULT_WEEKDAY_HOURS, type WeekdayHours } from '../../shared/weekdayHours'
import { deriveMonthDayCores, type MonthDayCore } from '../../shared/monthDayCore'

export interface DaySummary {
  date: string
  dayType: DayType
  workedHours: number
  entryTotal: number
  isEntriesBalanced: boolean
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
  weekdayHours?: WeekdayHours
}

export interface MonthSummaryResult {
  days: DaySummary[]
  workDayCount: number
  workedHoursPerDay: number[]
  hasAnyTrackedHours: boolean
  /** Today's worked hours including the still-to-come portion of a planned-stop period. */
  projectedWorkedHoursToday: number
}

function toDaySummary(core: MonthDayCore, isConfirmed: boolean, today: string): DaySummary {
  const {
    status: dayStatus,
    displayStatus,
    reason: statusReason,
    leaveType,
  } = classifyDay({
    dayType: core.dayType,
    workedHours: core.workedHours,
    manualTotal: core.entryTotal,
    isEntriesBalanced: core.isEntriesBalanced,
    isConfirmed,
    isoDate: core.date,
    today,
  })

  const categoryBreakdown = Object.fromEntries(
    Object.entries(core.categoryHours).filter(([cat]) => cat !== UNCATEGORIZED_CATEGORY),
  )

  return {
    date: core.date,
    dayType: core.dayType,
    workedHours: core.workedHours,
    entryTotal: core.entryTotal,
    isEntriesBalanced: core.isEntriesBalanced,
    isConfirmed,
    dayStatus,
    displayStatus,
    statusReason,
    categoryBreakdown,
    ...(leaveType !== undefined ? { leaveType } : {}),
  }
}

export function buildMonthSummaries(year: number, month: number, input: MonthSummaryInput): MonthSummaryResult {
  const { monthData, today, todayNow, weekdayHours = DEFAULT_WEEKDAY_HOURS } = input

  const { days: cores, projectedWorkedHoursToday } = deriveMonthDayCores({
    year,
    month,
    monthData,
    weekdayHours,
    today,
    ...(todayNow !== undefined ? { todayNow } : {}),
  })

  const days = cores.map((core) => toDaySummary(core, monthData[core.date]?.confirmed ?? false, today))
  const workDayCount = days.filter((d) => d.dayType === 'WorkDay').length
  const workedHoursPerDay = days.map((d) => d.workedHours)
  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)
  const todayIndex = days.findIndex((d) => d.date === today)

  return {
    days,
    workDayCount,
    workedHoursPerDay,
    hasAnyTrackedHours,
    projectedWorkedHoursToday: projectedWorkedHoursToday ?? workedHoursPerDay[todayIndex] ?? 0,
  }
}
