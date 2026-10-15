import type { Day, MonthData, WorkPeriod } from './types'

function isSamePeriod(a: WorkPeriod, b: WorkPeriod): boolean {
  return a.start === b.start && a.end === b.end && a.category === b.category
}

/**
 * Restoring from trash must not overwrite what was tracked since: current
 * periods and day fields win, trashed periods are added unless the same
 * start + end + category is already there.
 */
export function mergeRestoredDay(current: Day, trashed: Day): Day {
  const takenIds = new Set(current.windows.map((w) => w.id))
  const added = trashed.windows
    .filter((t) => !current.windows.some((c) => isSamePeriod(c, t)))
    .map((t) => (takenIds.has(t.id) ? { ...t, id: crypto.randomUUID() } : t))
  return { ...trashed, ...current, windows: [...current.windows, ...added] }
}

export function mergeRestoredMonth(current: MonthData, trashed: MonthData): MonthData {
  const merged: MonthData = { ...current }
  for (const [date, day] of Object.entries(trashed)) {
    merged[date] = mergeRestoredDay(current[date] ?? { windows: [] }, day)
  }
  return merged
}
