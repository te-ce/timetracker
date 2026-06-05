import type { WorkPeriod } from '../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../infra/repositories/types'
import { calculateWorkedHours } from './worktime'

export { UNCATEGORIZED_CATEGORY }

export function calculateCategoryHours(windows: WorkPeriod[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const w of windows) {
    const duration = calculateWorkedHours([w])
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
