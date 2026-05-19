import type { WorkWindow, WorkWindowRepository } from '../types'
import { toLocalIso } from '../../domain/dateUtils'

export class InMemoryWorkWindowRepository implements WorkWindowRepository {
  private readonly windows = new Map<string, WorkWindow>()

  constructor(initialWindows: WorkWindow[] = []) {
    for (const window of initialWindows) {
      this.windows.set(window.id, { ...window })
    }
  }

  save(window: WorkWindow): Promise<void> {
    this.windows.set(window.id, { ...window })

    return Promise.resolve()
  }

  findByDate(date: Date): Promise<WorkWindow[]> {
    const targetDate = toLocalIso(date)

    return Promise.resolve(
      [...this.windows.values()]
        .filter((window) => window.date === targetDate)
        .sort((left, right) => left.start.localeCompare(right.start)),
    )
  }

  findByDateRange(from: Date, to: Date): Promise<WorkWindow[]> {
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
