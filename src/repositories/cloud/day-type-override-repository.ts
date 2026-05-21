import type { StorageAdapter } from '../../storage/adapter'
import type { DayTypeOverride, DayTypeOverrideRepository } from '../types'
import { JsonRecordStore } from './json-store'

export class CloudDayTypeOverrideRepository implements DayTypeOverrideRepository {
  private store: JsonRecordStore<DayTypeOverride>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonRecordStore(adapter, 'day-type-overrides.json')
  }

  async save(date: string, dayType: DayTypeOverride): Promise<void> {
    await this.store.set(date, dayType)
  }

  async findByDate(date: string): Promise<DayTypeOverride | null> {
    return this.store.get(date)
  }

  async findByDateRange(from: string, to: string): Promise<Map<string, DayTypeOverride>> {
    return this.store.filterByKeyRange(from, to)
  }

  async delete(date: string): Promise<void> {
    await this.store.remove(date)
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
