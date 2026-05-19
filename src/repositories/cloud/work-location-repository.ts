import type { StorageAdapter } from '../../storage/adapter'
import type { WorkLocation, WorkLocationRepository } from '../types'
import { JsonRecordStore } from './json-store'

export class CloudWorkLocationRepository implements WorkLocationRepository {
  private store: JsonRecordStore<WorkLocation>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonRecordStore(adapter, 'work-locations.json')
  }

  async save(date: string, location: WorkLocation): Promise<void> {
    await this.store.set(date, location)
  }

  async findByDate(date: string): Promise<WorkLocation | null> {
    return this.store.get(date)
  }

  async findByDateRange(from: string, to: string): Promise<Map<string, WorkLocation>> {
    return this.store.filterByKeyRange(from, to)
  }

  async delete(date: string): Promise<void> {
    await this.store.remove(date)
  }
}

