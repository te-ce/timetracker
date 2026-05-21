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
