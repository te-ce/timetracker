import type { StorageAdapter } from '../../storage/adapter'
import type { WorkWindow, WorkWindowRepository } from '../types'

const KEY = 'work-windows.json'

export class CloudWorkWindowRepository implements WorkWindowRepository {
  private adapter: StorageAdapter
  private cache: WorkWindow[] | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  private async load(): Promise<WorkWindow[]> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<WorkWindow[]>(KEY)) ?? []
    return this.cache
  }

  private async persist(): Promise<void> {
    await this.adapter.put(KEY, this.cache)
  }

  async save(window: WorkWindow): Promise<void> {
    const windows = await this.load()
    const idx = windows.findIndex((w) => w.id === window.id)
    if (idx >= 0) windows[idx] = window
    else windows.push(window)
    await this.persist()
  }

  async findByDate(date: Date): Promise<WorkWindow[]> {
    const windows = await this.load()
    const iso = date.toISOString().slice(0, 10)
    return windows.filter((w) => w.date === iso)
  }

  async findByDateRange(from: Date, to: Date): Promise<WorkWindow[]> {
    const windows = await this.load()
    const fromIso = from.toISOString().slice(0, 10)
    const toIso = to.toISOString().slice(0, 10)
    return windows.filter((w) => w.date >= fromIso && w.date <= toIso)
  }

  async delete(id: string): Promise<void> {
    const windows = await this.load()
    this.cache = windows.filter((w) => w.id !== id)
    await this.persist()
  }
}
