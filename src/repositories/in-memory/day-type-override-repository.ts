import type { DayTypeOverride, DayTypeOverrideRepository } from '../types'

export class InMemoryDayTypeOverrideRepository implements DayTypeOverrideRepository {
  private store = new Map<string, DayTypeOverride>()

  constructor(initial: Array<{ date: string; dayType: DayTypeOverride }> = []) {
    for (const { date, dayType } of initial) {
      this.store.set(date, dayType)
    }
  }

  save(date: string, dayType: DayTypeOverride): Promise<void> {
    this.store.set(date, dayType)
    return Promise.resolve()
  }

  findByDate(date: string): Promise<DayTypeOverride | null> {
    return Promise.resolve(this.store.get(date) ?? null)
  }

  findByDateRange(from: string, to: string): Promise<Map<string, DayTypeOverride>> {
    const result = new Map<string, DayTypeOverride>()
    for (const [date, dayType] of this.store) {
      if (date >= from && date <= to) {
        result.set(date, dayType)
      }
    }
    return Promise.resolve(result)
  }

  delete(date: string): Promise<void> {
    this.store.delete(date)
    return Promise.resolve()
  }
}
