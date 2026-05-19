import type { StorageAdapter } from '../../storage/adapter'
import type { DayTypeOverride, DayTypeOverrideRepository } from '../types'

const KEY = 'day-type-overrides.json'

type OverrideStore = Record<string, DayTypeOverride>

export class CloudDayTypeOverrideRepository implements DayTypeOverrideRepository {
  private adapter: StorageAdapter
  private cache: OverrideStore | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  private async load(): Promise<OverrideStore> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<OverrideStore>(KEY)) ?? {}
    return this.cache
  }

  private async persist(): Promise<void> {
    await this.adapter.put(KEY, this.cache)
  }

  async save(date: string, dayType: DayTypeOverride): Promise<void> {
    const store = await this.load()
    store[date] = dayType
    await this.persist()
  }

  async findByDate(date: string): Promise<DayTypeOverride | null> {
    const store = await this.load()
    return store[date] ?? null
  }

  async findByDateRange(from: string, to: string): Promise<Map<string, DayTypeOverride>> {
    const store = await this.load()
    const result = new Map<string, DayTypeOverride>()
    for (const [date, dayType] of Object.entries(store)) {
      if (date >= from && date <= to) {
        result.set(date, dayType)
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
