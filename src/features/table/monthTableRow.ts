/**
 * How a month-table row is classified and painted.
 *
 * Shared by the row and by the cells it renders, which each live in their own
 * module, so this is the one place the styling rules are written down.
 */
import { classifyDay } from '../../shared/dayStatus'
import type { DaySummaryData } from '../../shared/DaySummaryBody'
import { categoryBreakdownWithAuto, type MonthTableRow } from './buildMonthTable'

export const STICKY_BG = 'bg-white dark:bg-gray-900'

function isMonday(isoDate: string): boolean {
  return new Date(isoDate + 'T12:00').getDay() === 1
}

export function overtimeTextClass(value: number): string {
  if (value > 0.01) return 'text-emerald-600 dark:text-emerald-400'
  if (value < -0.01) return 'text-red-600 dark:text-red-400'
  return 'text-gray-400 dark:text-gray-500'
}

export function classifyRow(row: MonthTableRow, today: string) {
  const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
  return classifyDay({
    dayType: row.dayType,
    workedHours: row.workedHours,
    manualTotal,
    isoDate: row.date,
    today,
  })
}

export function isDimRow(row: MonthTableRow): boolean {
  return row.dayType !== 'WorkDay' && row.workedHours === 0 && Object.keys(row.entries).length === 0
}

export function rowClassName(row: MonthTableRow, isToday: boolean, dim: boolean): string {
  const weekStartClass = isMonday(row.date) ? 'border-t-2 border-t-gray-300 dark:border-t-gray-600' : ''
  const todayClass = isToday ? 'bg-amber-50 dark:bg-amber-900/20' : ''
  const dimClass = dim ? 'opacity-50' : ''
  return `border-b border-gray-100 dark:border-gray-800 ${weekStartClass} ${todayClass} ${dimClass}`
}

export function workedHoursCellClassName(isToday: boolean): string {
  return `sticky left-[4.6rem] z-10 ${STICKY_BG}${isToday ? ' ring-2 ring-inset ring-amber-500 dark:ring-amber-400 font-semibold' : ''}`
}

export function buildDaySummaryData(
  row: MonthTableRow,
  classified: ReturnType<typeof classifyRow>,
  categoryDescriptions?: Record<string, string>,
  preferCategoryDescriptionAsPrimary?: boolean,
): DaySummaryData {
  const { displayStatus, reason, leaveType } = classified
  return {
    displayStatus,
    reason,
    workedHours: row.workedHours,
    categoryBreakdown: categoryBreakdownWithAuto(row),
    ...(categoryDescriptions !== undefined ? { categoryDescriptions } : {}),
    ...(preferCategoryDescriptionAsPrimary !== undefined ? { preferCategoryDescriptionAsPrimary } : {}),
    ...(leaveType !== undefined ? { leaveType } : {}),
  }
}
