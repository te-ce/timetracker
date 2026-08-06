import type { Day, DayTypeOverride, MonthData, WorkPeriod } from '../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../infra/repositories/types'
import { calculateWorkedHours } from './worktime'
import { targetHoursForDate, type WeekdayHours } from './weekdayHours'

export { UNCATEGORIZED_CATEGORY }

const LEAVE_CATEGORY = '_LEAVE'
const LEAVE_OVERRIDES = new Set<DayTypeOverride>(['Vacation', 'SickDay'])

/**
 * Category hours for a day, including auto-booked _LEAVE for leave days
 * (Vacation/SickDay) that have no logged work. Single source of truth shared
 * by the month table and the sprint/export aggregation.
 */
export function calculateDayCategoryHours(
  day: Pick<Day, 'windows' | 'dayTypeOverride' | 'halfDayLeave'>,
  date: string,
  weekdayHours: WeekdayHours,
  now?: string,
): Record<string, number> {
  const result = calculateCategoryHours(day.windows, now)
  const hasWork = Object.values(result).some((h) => h > 0.001)
  if (!hasWork && day.dayTypeOverride && LEAVE_OVERRIDES.has(day.dayTypeOverride)) {
    const leave = targetHoursForDate(date, weekdayHours)
    if (leave > 0) result[LEAVE_CATEGORY] = leave
  } else if (day.halfDayLeave) {
    // A half-day leave still expects work on the other half, so it's booked
    // alongside whatever hours are logged rather than only when none are.
    const halfLeave = targetHoursForDate(date, weekdayHours) / 2
    if (halfLeave > 0) result[LEAVE_CATEGORY] = (result[LEAVE_CATEGORY] ?? 0) + halfLeave
  }
  return result
}

/** Duration left over once subtask hours are carved out, floored at 0. */
export function remainderHours(duration: number, subtaskedHours: number): number {
  return Math.max(0, duration - subtaskedHours)
}

export function calculateCategoryHours(windows: WorkPeriod[], now?: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const w of windows) {
    const duration = calculateWorkedHours([w], now)
    const subtaskedHours = w.subtasks.reduce((sum, s) => sum + s.hours, 0)
    const remainder = remainderHours(duration, subtaskedHours)
    for (const subtask of w.subtasks) {
      result[subtask.category] = (result[subtask.category] ?? 0) + subtask.hours
    }
    if (remainder > 0.001) {
      result[w.category] = (result[w.category] ?? 0) + remainder
    }
  }
  return result
}

/** Booked hours per category across every day of every given month, excluding UNCATEGORIZED. */
export function sumCategoryHoursAcrossMonths(months: MonthData[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const monthData of months) {
    for (const day of Object.values(monthData)) {
      for (const [category, hours] of Object.entries(calculateCategoryHours(day.windows))) {
        if (category === UNCATEGORIZED_CATEGORY) continue
        totals[category] = (totals[category] ?? 0) + hours
      }
    }
  }
  return totals
}

export function calculateTotalCategorizedHours(windows: WorkPeriod[]): number {
  const hours = calculateCategoryHours(windows)
  let total = 0
  for (const [cat, h] of Object.entries(hours)) {
    if (cat !== UNCATEGORIZED_CATEGORY) total += h
  }
  return total
}
