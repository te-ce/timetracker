import type { StorageAdapter } from '../../storage/adapter'
import type { DayNoteRepository } from '../types'
import { JsonRecordStore } from './json-store'

export class CloudDayNoteRepository implements DayNoteRepository {
  private store: JsonRecordStore<string>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonRecordStore(adapter, 'day-notes.json')
  }

  async save(date: string, note: string): Promise<void> {
    await this.store.set(date, note)
  }

  async findByDate(date: string): Promise<string | null> {
    return this.store.get(date)
  }

  async findByDateRange(from: string, to: string): Promise<Map<string, string>> {
    return this.store.filterByKeyRange(from, to)
  }

  async delete(date: string): Promise<void> {
    await this.store.remove(date)
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
