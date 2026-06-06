import type { StorageAdapter } from '../../storage/adapter'
import type { SprintExport, SprintExportRepository } from '../types'
import { JsonCollectionStore } from './json-store'
import { validateSprintExport } from '../configSchema'

export class CloudSprintExportRepository implements SprintExportRepository {
  private store: JsonCollectionStore<SprintExport>

  constructor(adapter: StorageAdapter) {
    this.store = new JsonCollectionStore(adapter, 'sprint-exports.json', validateSprintExport)
  }

  async save(sprintExport: SprintExport): Promise<void> {
    await this.store.upsert(sprintExport, (e) => e.sprintIndex)
  }

  async findBySprintIndex(sprintIndex: number): Promise<SprintExport | null> {
    return this.store.find((e) => e.sprintIndex === sprintIndex)
  }

  clearCache(): void {
    this.store.clearCache()
  }
}
