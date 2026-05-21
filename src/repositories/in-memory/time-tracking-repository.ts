import type { ActiveTracking, TimeTrackingRepository } from '../types'

export class InMemoryTimeTrackingRepository implements TimeTrackingRepository {
  private active: ActiveTracking | null = null

  start(date: string, category: string): Promise<void> {
    this.active = { category, date, startedAt: new Date().toISOString() }
    return Promise.resolve()
  }

  stop(): Promise<{ category: string; date: string; hours: number } | null> {
    if (!this.active) return Promise.resolve(null)
    const elapsed = (Date.now() - new Date(this.active.startedAt).getTime()) / (1000 * 60 * 60)
    const hours = Math.round(elapsed * 100) / 100
    const result = { category: this.active.category, date: this.active.date, hours }
    this.active = null
    if (hours <= 0) return Promise.resolve(null)
    return Promise.resolve(result)
  }

  getActive(): Promise<ActiveTracking | null> {
    return Promise.resolve(this.active)
  }
}
