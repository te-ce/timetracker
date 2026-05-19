import type { StorageAdapter } from '../../storage/adapter'
import type { WorkLocation, WorkLocationRepository } from '../types'

const KEY = 'work-locations.json'

type LocationStore = Record<string, WorkLocation>

export class CloudWorkLocationRepository implements WorkLocationRepository {
  private adapter: StorageAdapter
  private cache: LocationStore | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  private async load(): Promise<LocationStore> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<LocationStore>(KEY)) ?? {}
    return this.cache
  }

  private async persist(): Promise<void> {
    await this.adapter.put(KEY, this.cache)
  }

  async save(date: string, location: WorkLocation): Promise<void> {
    const store = await this.load()
    store[date] = location
    await this.persist()
  }

  async findByDate(date: string): Promise<WorkLocation | null> {
    const store = await this.load()
    return store[date] ?? null
  }

  async findByDateRange(from: string, to: string): Promise<Map<string, WorkLocation>> {
    const store = await this.load()
    const result = new Map<string, WorkLocation>()
    for (const [date, location] of Object.entries(store)) {
      if (date >= from && date <= to) {
        result.set(date, location)
      }
    }
    return result
  }

  async delete(date: string): Promise<void> {
    const store = await this.load()
    delete store[date]
    await this.persist()
  }
}
