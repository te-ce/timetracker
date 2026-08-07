import type { Day, MonthData } from '../types'
import { AbstractMonthRepository, isDayEmpty } from '../abstract-month-repository'

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export class InMemoryMonthRepository extends AbstractMonthRepository {
  private months = new Map<string, MonthData>()

  constructor(initial: Record<string, MonthData> = {}) {
    super()
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
    const current = data[date] ?? { windows: [] }
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

  restoreMonth(year: number, month: number, data: MonthData): Promise<void> {
    this.months.set(monthKey(year, month), structuredClone(data))
    return Promise.resolve()
  }

  getAllMonths(): Promise<string[]> {
    return Promise.resolve([...this.months.keys()].sort())
  }
}
