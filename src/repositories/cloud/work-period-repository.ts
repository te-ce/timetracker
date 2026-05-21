import type { StorageAdapter } from '../../storage/adapter'
import type { WorkPeriod, WorkPeriodRepository } from '../types'
import { JsonCollectionStore } from './json-store'

export class CloudWorkPeriodRepository implements WorkPeriodRepository {
  private store: JsonCollectionStore<WorkPeriod>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonCollectionStore(adapter, 'work-windows.json')
  }

  async save(window: WorkPeriod): Promise<void> {
    await this.store.upsert(window, (w) => w.id)
  }

  async findByDate(date: Date): Promise<WorkPeriod[]> {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return this.store.filter((w) => w.date === iso)
  }

  async findByDateRange(from: Date, to: Date): Promise<WorkPeriod[]> {
    const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
    const toIso = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`
    return this.store.filter((w) => w.date >= fromIso && w.date <= toIso)
  }

  async delete(id: string): Promise<void> {
    await this.store.remove(id, (w) => w.id)
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
