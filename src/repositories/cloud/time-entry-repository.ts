import type { StorageAdapter } from '../../storage/adapter'
import type { TimeEntry, TimeEntryRepository } from '../types'
import { JsonCollectionStore } from './json-store'

export class CloudTimeEntryRepository implements TimeEntryRepository {
  private store: JsonCollectionStore<TimeEntry>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonCollectionStore(adapter, 'time-entries.json')
  }

  async save(entry: TimeEntry): Promise<void> {
    await this.store.upsert(entry, (e) => e.id)
  }

  async findByDateRange(from: Date, to: Date): Promise<TimeEntry[]> {
    const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
    const toIso = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`
    return this.store.filter((e) => e.date >= fromIso && e.date <= toIso)
  }

  async delete(id: string): Promise<void> {
    await this.store.remove(id, (e) => e.id)
  }
}
