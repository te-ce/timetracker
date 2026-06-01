import type { Day, DatedTimeEntry, MonthData, MonthRepository } from '../types'

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function isDayEmpty(day: Day): boolean {
  return (
    day.entries.length === 0 &&
    day.windows.length === 0 &&
    day.location === undefined &&
    !day.confirmed &&
    !day.note &&
    !day.autoCategoryOverride &&
    !day.dayTypeOverride
  )
}

export class InMemoryMonthRepository implements MonthRepository {
  private months = new Map<string, MonthData>()

  constructor(initial: Record<string, MonthData> = {}) {
    for (const [ym, data] of Object.entries(initial)) {
      this.months.set(ym, structuredClone(data))
    }
  }

  getMonth(year: number, month: number): Promise<MonthData> {
    return Promise.resolve(structuredClone(this.months.get(monthKey(year, month)) ?? {}))
  }

  updateDay(date: string, updater: (current: Day) => Day): Promise<void> {
    const ym = date.slice(0, 7)
    const data = structuredClone(this.months.get(ym) ?? {})
    const current = data[date] ?? { entries: [], windows: [] }
    const updated = updater(current)
    if (isDayEmpty(updated)) {
      delete data[date]
    } else {
      data[date] = updated
    }
    this.months.set(ym, data)
    return Promise.resolve()
  }

  deleteMonth(year: number, month: number): Promise<void> {
    this.months.delete(monthKey(year, month))
    return Promise.resolve()
  }

  findEntriesByDateRange(from: string, to: string): Promise<DatedTimeEntry[]> {
    const result: DatedTimeEntry[] = []
    for (const [, data] of this.months) {
      for (const [date, day] of Object.entries(data)) {
        if (date >= from && date <= to) {
          for (const entry of day.entries) {
            result.push({ ...entry, date })
          }
        }
      }
    }
    return Promise.resolve(result)
  }

  getAllMonths(): Promise<string[]> {
    return Promise.resolve([...this.months.keys()].sort())
  }

  clearCache(): void {
    // no-op for in-memory
  }
}
