import type { StorageAdapter } from '../../storage/adapter'
import type { SprintExport, SprintExportRepository } from '../types'

const KEY = 'sprint-exports.json'

export class CloudSprintExportRepository implements SprintExportRepository {
  private adapter: StorageAdapter
  private cache: SprintExport[] | null = null

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  private async load(): Promise<SprintExport[]> {
    if (this.cache) return this.cache
    this.cache = (await this.adapter.get<SprintExport[]>(KEY)) ?? []
    return this.cache
  }

  private async persist(): Promise<void> {
    await this.adapter.put(KEY, this.cache)
  }

  async save(sprintExport: SprintExport): Promise<void> {
    const exports = await this.load()
    const idx = exports.findIndex((e) => e.sprintIndex === sprintExport.sprintIndex)
    if (idx >= 0) exports[idx] = sprintExport
    else exports.push(sprintExport)
    await this.persist()
  }

  async findBySprintIndex(sprintIndex: number): Promise<SprintExport | null> {
    const exports = await this.load()
    return exports.find((e) => e.sprintIndex === sprintIndex) ?? null
  }
}
