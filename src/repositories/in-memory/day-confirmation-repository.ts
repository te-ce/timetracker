import type { DayConfirmationRepository } from '../types'

export class InMemoryDayConfirmationRepository implements DayConfirmationRepository {
  private store = new Set<string>()

  constructor(initial: string[] = []) {
    for (const date of initial) {
      this.store.add(date)
    }
  }

  confirm(date: string): Promise<void> {
    this.store.add(date)
    return Promise.resolve()
  }

  unconfirm(date: string): Promise<void> {
    this.store.delete(date)
    return Promise.resolve()
  }

  isConfirmed(date: string): Promise<boolean> {
    return Promise.resolve(this.store.has(date))
  }

  findConfirmedInRange(from: string, to: string): Promise<Set<string>> {
    const result = new Set<string>()
    for (const date of this.store) {
      if (date >= from && date <= to) result.add(date)
    }
    return Promise.resolve(result)
  }
}
