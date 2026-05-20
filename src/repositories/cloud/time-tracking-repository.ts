import type { StorageAdapter } from '../../storage/adapter'
import type { ActiveTracking, TimeTrackingRepository } from '../types'

const KEY = 'active-tracking.json'

export class CloudTimeTrackingRepository implements TimeTrackingRepository {
  constructor(private adapter: StorageAdapter) {}

  async start(date: string, category: string): Promise<void> {
    const tracking: ActiveTracking = {
      category,
      date,
      startedAt: new Date().toISOString(),
    }
    await this.adapter.put(KEY, tracking)
  }

  async stop(): Promise<{ category: string; date: string; hours: number } | null> {
    const tracking = await this.adapter.get<ActiveTracking>(KEY)
    if (!tracking) return null

    const elapsed = (Date.now() - new Date(tracking.startedAt).getTime()) / (1000 * 60 * 60)
    const hours = Math.round(elapsed * 100) / 100

    await this.adapter.delete(KEY)
    if (hours <= 0) return null
    return { category: tracking.category, date: tracking.date, hours }
  }

  async getActive(): Promise<ActiveTracking | null> {
    return this.adapter.get<ActiveTracking>(KEY)
  }
}
