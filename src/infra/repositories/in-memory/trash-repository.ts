import type { Day, MonthData, MonthRepository, TrashEntry, TrashRepository } from '../types'

export class InMemoryTrashRepository implements TrashRepository {
  private monthRepo: MonthRepository
  private monthEntries = new Map<string, { entry: TrashEntry; payload: MonthData }>()
  private dayEntries = new Map<string, { entry: TrashEntry; payload: Day }>()

  constructor(monthRepo: MonthRepository) {
    this.monthRepo = monthRepo
  }

  moveMonthToTrash(year: number, month: number, data: MonthData): Promise<string> {
    const id = crypto.randomUUID()
    this.monthEntries.set(id, {
      entry: { id, type: 'month', year, month, deletedAt: new Date().toISOString() },
      payload: structuredClone(data),
    })
    return Promise.resolve(id)
  }

  moveDayToTrash(date: string, day: Day): Promise<string> {
    const id = crypto.randomUUID()
    const year = parseInt(date.slice(0, 4), 10)
    const month = parseInt(date.slice(5, 7), 10)
    this.dayEntries.set(id, {
      entry: { id, type: 'day', year, month, date, deletedAt: new Date().toISOString() },
      payload: structuredClone(day),
    })
    return Promise.resolve(id)
  }

  list(): Promise<TrashEntry[]> {
    const entries = [
      ...[...this.monthEntries.values()].map((r) => r.entry),
      ...[...this.dayEntries.values()].map((r) => r.entry),
    ]
    return Promise.resolve(entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)))
  }

  async restore(id: string): Promise<void> {
    const monthRecord = this.monthEntries.get(id)
    if (monthRecord) {
      await this.monthRepo.restoreMonth(monthRecord.entry.year, monthRecord.entry.month, monthRecord.payload)
      this.monthEntries.delete(id)
      return
    }
    const dayRecord = this.dayEntries.get(id)
    if (dayRecord?.entry.date) {
      await this.monthRepo.updateDay(dayRecord.entry.date, () => dayRecord.payload)
      this.dayEntries.delete(id)
    }
  }

  purge(id: string): Promise<void> {
    this.monthEntries.delete(id)
    this.dayEntries.delete(id)
    return Promise.resolve()
  }

  purgeExpired(maxAgeDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString()
    for (const [id, record] of this.monthEntries) {
      if (record.entry.deletedAt < cutoff) this.monthEntries.delete(id)
    }
    for (const [id, record] of this.dayEntries) {
      if (record.entry.deletedAt < cutoff) this.dayEntries.delete(id)
    }
    return Promise.resolve()
  }
}
