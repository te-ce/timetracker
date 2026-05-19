import type { TimeEntry, TimeEntryRepository } from '../types'

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

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
    const fromDate = toIsoDate(from)
    const toDate = toIsoDate(to)

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
