import type { StorageAdapter } from '../../storage/adapter'
import type { TimeEntry, TimeEntryRepository } from '../types'

const KEY = 'time-entries.json'

export class CloudTimeEntryRepository implements TimeEntryRepository {
  private adapter: StorageAdapter
  private cache: TimeEntry[] | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  private async load(): Promise<TimeEntry[]> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<TimeEntry[]>(KEY)) ?? []
    return this.cache
  }

  private async persist(): Promise<void> {
    await this.adapter.put(KEY, this.cache)
  }

  async save(entry: TimeEntry): Promise<void> {
    const entries = await this.load()
    const idx = entries.findIndex((e) => e.id === entry.id)
    if (idx >= 0) entries[idx] = entry
    else entries.push(entry)
    await this.persist()
  }

  async findByDateRange(from: Date, to: Date): Promise<TimeEntry[]> {
    const entries = await this.load()
    const fromIso = from.toISOString().slice(0, 10)
    const toIso = to.toISOString().slice(0, 10)
    return entries.filter((e) => e.date >= fromIso && e.date <= toIso)
  }

  async delete(id: string): Promise<void> {
    const entries = await this.load()
    this.cache = entries.filter((e) => e.id !== id)
    await this.persist()
  }
}
