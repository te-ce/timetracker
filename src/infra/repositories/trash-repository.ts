import { z } from 'zod'
import type { StorageAdapter } from '../storage/adapter'
import type { Day, MonthData, MonthRepository, TrashEntry, TrashRepository as ITrashRepository } from './types'
import { JsonRecordStore, JsonValueStore } from './cloud/json-store'
import { validateDay } from './configSchema'

const trashEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['month', 'day']),
  year: z.number(),
  month: z.number(),
  date: z.string().optional(),
  deletedAt: z.string(),
})

function validateTrashEntry(v: unknown): TrashEntry | null {
  const r = trashEntrySchema.safeParse(v)
  if (!r.success) return null
  const { id, type, year, month, date, deletedAt } = r.data
  return { id, type, year, month, deletedAt, ...(date !== undefined ? { date } : {}) }
}

function payloadKey(id: string): string {
  return `trash/${id}.json`
}

export class TrashRepository implements ITrashRepository {
  private adapter: StorageAdapter
  private monthRepo: MonthRepository
  private index: JsonRecordStore<TrashEntry>

  constructor(adapter: StorageAdapter, monthRepo: MonthRepository) {
    this.adapter = adapter
    this.monthRepo = monthRepo
    this.index = new JsonRecordStore<TrashEntry>(adapter, 'trash-index.json', validateTrashEntry)
  }

  async moveMonthToTrash(year: number, month: number, data: MonthData): Promise<string> {
    const id = crypto.randomUUID()
    const store = new JsonRecordStore<Day>(this.adapter, payloadKey(id), validateDay)
    for (const [date, day] of Object.entries(data)) {
      await store.set(date, day)
    }
    await this.index.set(id, { id, type: 'month', year, month, deletedAt: new Date().toISOString() })
    return id
  }

  async moveDayToTrash(date: string, day: Day): Promise<string> {
    const id = crypto.randomUUID()
    const store = new JsonValueStore<Day>(this.adapter, payloadKey(id), validateDay, { windows: [] })
    await store.set(day)
    const year = parseInt(date.slice(0, 4), 10)
    const month = parseInt(date.slice(5, 7), 10)
    await this.index.set(id, { id, type: 'day', year, month, date, deletedAt: new Date().toISOString() })
    return id
  }

  async list(): Promise<TrashEntry[]> {
    const entries = Object.values(await this.index.getAll())
    return entries.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  }

  async restore(id: string): Promise<void> {
    const entry = await this.index.get(id)
    if (!entry) return
    if (entry.type === 'month') {
      const store = new JsonRecordStore<Day>(this.adapter, payloadKey(id), validateDay)
      const data = await store.getAll()
      await this.monthRepo.restoreMonth(entry.year, entry.month, data)
    } else if (entry.date) {
      const store = new JsonValueStore<Day>(this.adapter, payloadKey(id), validateDay, { windows: [] })
      const day = await store.get()
      await this.monthRepo.updateDay(entry.date, () => day)
    }
    await this.purge(id)
  }

  async purge(id: string): Promise<void> {
    await this.index.remove(id)
    await this.adapter.delete(payloadKey(id))
  }

  async purgeExpired(maxAgeDays: number): Promise<void> {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString()
    const expired = (await this.list()).filter((entry) => entry.deletedAt < cutoff)
    for (const entry of expired) {
      await this.purge(entry.id)
    }
  }

  clearCache(): void {
    this.index.clearCache()
  }
}
