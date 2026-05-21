import type { WorkPeriod, WorkPeriodRepository } from '../types'
import { toLocalIso } from '../../domain/dateUtils'

export class InMemoryWorkPeriodRepository implements WorkPeriodRepository {
  private readonly windows = new Map<string, WorkPeriod>()

  constructor(initialWindows: WorkPeriod[] = []) {
    for (const window of initialWindows) {
      this.windows.set(window.id, { ...window })
    }
  }

  save(window: WorkPeriod): Promise<void> {
    this.windows.set(window.id, { ...window })

    return Promise.resolve()
  }

  findByDate(date: Date): Promise<WorkPeriod[]> {
    const targetDate = toLocalIso(date)

    return Promise.resolve(
      [...this.windows.values()]
        .filter((window) => window.date === targetDate)
        .sort((left, right) => left.start.localeCompare(right.start)),
    )
  }

  findByDateRange(from: Date, to: Date): Promise<WorkPeriod[]> {
    const fromDate = toLocalIso(from)
    const toDate = toLocalIso(to)

    return Promise.resolve(
      [...this.windows.values()]
        .filter((window) => window.date >= fromDate && window.date <= toDate)
        .sort((left, right) => left.date.localeCompare(right.date) || left.start.localeCompare(right.start)),
    )
  }

  delete(id: string): Promise<void> {
    this.windows.delete(id)

    return Promise.resolve()
  }
}
