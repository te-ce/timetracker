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
    await this.adapter.write(KEY, JSON.stringify(tracking))
  }

  async stop(): Promise<{ category: string; date: string; hours: number } | null> {
    const raw = await this.adapter.read(KEY)
    if (!raw) return null

    const tracking: ActiveTracking = JSON.parse(raw)
    const elapsed = (Date.now() - new Date(tracking.startedAt).getTime()) / (1000 * 60 * 60)
    const hours = Math.round(elapsed * 100) / 100 // round to 2 decimals

    await this.adapter.write(KEY, '')
    if (hours <= 0) return null
    return { category: tracking.category, date: tracking.date, hours }
  }

  async getActive(): Promise<ActiveTracking | null> {
    const raw = await this.adapter.read(KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as ActiveTracking
    } catch {
      return null
    }
  }
}
