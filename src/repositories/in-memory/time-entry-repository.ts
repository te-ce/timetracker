import type { TimeEntry, TimeEntryRepository } from '../types'
import { toLocalIso } from '../../domain/dateUtils'

export class InMemoryTimeEntryRepository implements TimeEntryRepository {
  private readonly entries = new Map<string, TimeEntry>()

  constructor(initialEntries: TimeEntry[] = []) {
    for (const entry of initialEntries) {
      this.entries.set(entry.id, { ...entry })
    }
  }

  save(entry: TimeEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry })

    return Promise.resolve()
  }

  findByDateRange(from: Date, to: Date): Promise<TimeEntry[]> {
    const fromDate = toLocalIso(from)
    const toDate = toLocalIso(to)

    return Promise.resolve(
      [...this.entries.values()]
        .filter((entry) => entry.date >= fromDate && entry.date <= toDate)
        .sort((left, right) => left.date.localeCompare(right.date)),
    )
  }

  delete(id: string): Promise<void> {
    this.entries.delete(id)
    return Promise.resolve()
  }
}
