import type { WorkLocation, WorkLocationRepository } from '../types'

export class InMemoryWorkLocationRepository implements WorkLocationRepository {
  private readonly locations = new Map<string, WorkLocation>()

  save(date: string, location: WorkLocation): Promise<void> {
    this.locations.set(date, location)
    return Promise.resolve()
  }

  findByDate(date: string): Promise<WorkLocation | null> {
    return Promise.resolve(this.locations.get(date) ?? null)
  }

  findByDateRange(from: string, to: string): Promise<Map<string, WorkLocation>> {
    const result = new Map<string, WorkLocation>()
    for (const [date, location] of this.locations) {
      if (date >= from && date <= to) {
        result.set(date, location)
      }
    }
    return Promise.resolve(result)
  }

  delete(date: string): Promise<void> {
    this.locations.delete(date)
    return Promise.resolve()
  }
}
