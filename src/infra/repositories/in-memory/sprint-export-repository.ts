import type { SprintExport, SprintExportRepository } from '../types'

export class InMemorySprintExportRepository implements SprintExportRepository {
  private readonly exports = new Map<number, SprintExport>()

  save(sprintExport: SprintExport): Promise<void> {
    this.exports.set(sprintExport.sprintIndex, { ...sprintExport })
    return Promise.resolve()
  }

  findBySprintIndex(sprintIndex: number): Promise<SprintExport | null> {
    const entry = this.exports.get(sprintIndex)
    return Promise.resolve(entry ? { ...entry } : null)
  }
}
