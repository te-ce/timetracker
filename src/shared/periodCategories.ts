import type { Day, DayTypeOverride, WorkPeriod } from '../infra/repositories/types'
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
  day: Pick<Day, 'windows' | 'dayTypeOverride'>,
  date: string,
  weekdayHours: WeekdayHours,
  now?: string,
): Record<string, number> {
  const result = calculateCategoryHours(day.windows, now)
  const hasWork = Object.values(result).some((h) => h > 0.001)
  if (!hasWork && day.dayTypeOverride && LEAVE_OVERRIDES.has(day.dayTypeOverride)) {
    const leave = targetHoursForDate(date, weekdayHours)
    if (leave > 0) result[LEAVE_CATEGORY] = leave
  }
  return result
}

export function calculateCategoryHours(windows: WorkPeriod[], now?: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const w of windows) {
    const duration = calculateWorkedHours([w], now)
    const subtaskedHours = w.subtasks.reduce((sum, s) => sum + s.hours, 0)
    const remainder = Math.max(0, duration - subtaskedHours)
    for (const subtask of w.subtasks) {
      result[subtask.category] = (result[subtask.category] ?? 0) + subtask.hours
    }
    if (remainder > 0.001) {
      result[w.category] = (result[w.category] ?? 0) + remainder
    }
  }
  return result
}

export function calculateTotalCategorizedHours(windows: WorkPeriod[]): number {
  const hours = calculateCategoryHours(windows)
  let total = 0
  for (const [cat, h] of Object.entries(hours)) {
    if (cat !== UNCATEGORIZED_CATEGORY) total += h
  }
  return total
}

export function calculateUncategorizedHours(windows: WorkPeriod[]): number {
  return calculateCategoryHours(windows)[UNCATEGORIZED_CATEGORY] ?? 0
}
