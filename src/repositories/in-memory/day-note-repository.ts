import type { DayNoteRepository } from '../types'

export class InMemoryDayNoteRepository implements DayNoteRepository {
  private readonly notes = new Map<string, string>()

  save(date: string, note: string): Promise<void> {
    this.notes.set(date, note)
    return Promise.resolve()
  }

  findByDate(date: string): Promise<string | null> {
    return Promise.resolve(this.notes.get(date) ?? null)
  }

  findByDateRange(from: string, to: string): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    for (const [date, note] of this.notes) {
      if (date >= from && date <= to) result.set(date, note)
    }
    return Promise.resolve(result)
  }

  delete(date: string): Promise<void> {
    this.notes.delete(date)
    return Promise.resolve()
  }
}
