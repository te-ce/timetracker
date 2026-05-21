import type { StorageAdapter } from '../../storage/adapter'
import type { DayConfirmationRepository } from '../types'
import { JsonRecordStore } from './json-store'

export class CloudDayConfirmationRepository implements DayConfirmationRepository {
  private store: JsonRecordStore<boolean>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonRecordStore(adapter, 'day-confirmations.json')
  }

  async confirm(date: string): Promise<void> {
    await this.store.set(date, true)
  }

  async unconfirm(date: string): Promise<void> {
    await this.store.remove(date)
  }

  async isConfirmed(date: string): Promise<boolean> {
    const val = await this.store.get(date)
    return val === true
  }

  async findConfirmedInRange(from: string, to: string): Promise<Set<string>> {
    const map = await this.store.filterByKeyRange(from, to)
    const result = new Set<string>()
    for (const [date, confirmed] of map) {
      if (confirmed) result.add(date)
    }
    return result
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
