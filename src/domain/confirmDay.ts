import { calculateWorkedHours } from './worktime'
import { calculateAutoCategory } from './autoCategory'
import type { WorkPeriod, TimeEntry, Day } from '../repositories/types'

export function buildConfirmedDay(
  windows: WorkPeriod[],
  manualEntries: TimeEntry[],
  autoCategoryOverride: string | null,
  globalAutoCategory: string | null,
  currentDay: Day,
): Day {
  const manualTotal = manualEntries.reduce((s, e) => s + e.hours, 0)
  const autoHours = calculateAutoCategory(calculateWorkedHours(windows), manualTotal).hours
  const resolvedAuto = autoCategoryOverride ?? globalAutoCategory
  const withoutAuto = resolvedAuto
    ? currentDay.entries.filter((e) => e.category !== resolvedAuto)
    : currentDay.entries
  const autoEntry =
    resolvedAuto && autoHours > 0
      ? [
          {
            id: currentDay.entries.find((e) => e.category === resolvedAuto)?.id ?? crypto.randomUUID(),
            category: resolvedAuto,
            hours: autoHours,
          },
        ]
      : []
  return { ...currentDay, entries: [...withoutAuto, ...autoEntry], confirmed: true }
}
