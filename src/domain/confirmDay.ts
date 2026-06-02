import { calculateWorkedHours } from './worktime'
import { resolveAutoCategory } from './autoCategory'
import type { WorkPeriod, TimeEntry, MonthRepository } from '../repositories/types'

export async function confirmDay(
  date: string,
  windows: WorkPeriod[],
  entries: TimeEntry[],
  autoCategoryOverride: string | null,
  globalAutoCategory: string | null,
  repository: MonthRepository,
): Promise<void> {
  const autoHours = Math.max(0, calculateWorkedHours(windows) - entries.reduce((s, e) => s + e.hours, 0))
  const dayOverrides = autoCategoryOverride
    ? new Map<string, string>([[date, autoCategoryOverride]])
    : new Map<string, string>()
  const resolvedAuto = resolveAutoCategory(date, dayOverrides, globalAutoCategory)
  await repository.updateDay(date, (day) => {
    let updatedEntries = [...day.entries]
    if (resolvedAuto && autoHours > 0) {
      const existing = updatedEntries.find((e) => e.category === resolvedAuto)
      updatedEntries = updatedEntries.filter((e) => e.category !== resolvedAuto || e.id === existing?.id)
      const autoEntry = {
        id: existing?.id ?? crypto.randomUUID(),
        category: resolvedAuto,
        hours: (existing?.hours ?? 0) + autoHours,
      }
      updatedEntries = [...updatedEntries.filter((e) => e.id !== autoEntry.id), autoEntry]
    }
    return { ...day, entries: updatedEntries, confirmed: true }
  })
}
