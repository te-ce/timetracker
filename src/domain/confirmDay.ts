import { calculateWorkedHours } from './worktime'
import { calculateAutoCategory, resolveAutoCategory } from './autoCategory'
import type { WorkPeriod, TimeEntry, MonthRepository } from '../repositories/types'

export async function confirmDay(
  date: string,
  windows: WorkPeriod[],
  entries: TimeEntry[],
  autoCategoryOverride: string | null,
  globalAutoCategory: string | null,
  repository: MonthRepository,
): Promise<void> {
  const manualTotal = entries.reduce((s, e) => s + e.hours, 0)
  const autoHours = calculateAutoCategory(calculateWorkedHours(windows), manualTotal).hours
  const dayOverrides = autoCategoryOverride
    ? new Map<string, string>([[date, autoCategoryOverride]])
    : new Map<string, string>()
  const resolvedAuto = resolveAutoCategory(date, dayOverrides, globalAutoCategory)
  await repository.updateDay(date, (day) => {
    const withoutAuto = resolvedAuto
      ? day.entries.filter((e) => e.category !== resolvedAuto)
      : day.entries
    const autoEntry =
      resolvedAuto && autoHours > 0
        ? [
            {
              id: day.entries.find((e) => e.category === resolvedAuto)?.id ?? crypto.randomUUID(),
              category: resolvedAuto,
              hours: autoHours,
            },
          ]
        : []
    return { ...day, entries: [...withoutAuto, ...autoEntry], confirmed: true }
  })
}
