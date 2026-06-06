import type { StorageAdapter } from '../../storage/adapter'
import type { ActiveTracking, TimeTrackingRepository } from '../types'
import { validateActiveTracking } from '../configSchema'

const KEY = 'active-tracking.json'

export class CloudTimeTrackingRepository implements TimeTrackingRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  async start(date: string, category: string): Promise<void> {
    const tracking: ActiveTracking = {
      category,
      date,
      startedAt: new Date().toISOString(),
    }
    await this.adapter.put(KEY, tracking)
  }

  private async loadTracking(): Promise<ActiveTracking | null> {
    const raw: unknown = await this.adapter.get<unknown>(KEY)
    if (raw === null) return null
    const result = validateActiveTracking(raw)
    if (result === null) {
      console.warn('[CloudTimeTrackingRepository] invalid stored tracking data, discarding', raw)
    }
    return result
  }

  async stop(): Promise<{ category: string; date: string; hours: number } | null> {
    const tracking = await this.loadTracking()
    if (!tracking) return null

    const elapsed = (Date.now() - new Date(tracking.startedAt).getTime()) / (1000 * 60 * 60)
    const hours = Math.round(elapsed * 100) / 100

    await this.adapter.delete(KEY)
    if (hours <= 0) return null
    return { category: tracking.category, date: tracking.date, hours }
  }

  async getActive(): Promise<ActiveTracking | null> {
    return this.loadTracking()
  }
}
