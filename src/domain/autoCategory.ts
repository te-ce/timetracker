import type { TimeEntry } from '../repositories/types'

export type AutoCategoryResult = {
  hours: number
  isOverbooked: boolean
}

export function calculateAutoCategory(workedHours: number, manualEntries: TimeEntry[]): AutoCategoryResult {
  const manualTotal = manualEntries.reduce((sum, e) => sum + e.hours, 0)
  const remaining = workedHours - manualTotal
  return {
    hours: Math.max(0, remaining),
    isOverbooked: remaining < 0,
  }
}

export function resolveAutoCategory(
  date: string,
  dayOverrides: Map<string, string>,
  globalDefault: string | null,
): string | null {
  return dayOverrides.get(date) ?? globalDefault
}
