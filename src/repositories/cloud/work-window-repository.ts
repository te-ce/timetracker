import type { StorageAdapter } from '../../storage/adapter'
import type { WorkWindow, WorkWindowRepository } from '../types'
import { JsonCollectionStore } from './json-store'

export class CloudWorkWindowRepository implements WorkWindowRepository {
  private store: JsonCollectionStore<WorkWindow>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonCollectionStore(adapter, 'work-windows.json')
  }

  async save(window: WorkWindow): Promise<void> {
    await this.store.upsert(window, (w) => w.id)
  }

  async findByDate(date: Date): Promise<WorkWindow[]> {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return this.store.filter((w) => w.date === iso)
  }

  async findByDateRange(from: Date, to: Date): Promise<WorkWindow[]> {
    const fromIso = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`
    const toIso = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}`
    return this.store.filter((w) => w.date >= fromIso && w.date <= toIso)
  }

  async delete(id: string): Promise<void> {
    await this.store.remove(id, (w) => w.id)
  }
}

