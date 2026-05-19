import type { WorkWindow, WorkWindowRepository } from '../types'

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export class InMemoryWorkWindowRepository implements WorkWindowRepository {
  private readonly windows = new Map<string, WorkWindow>()

  constructor(initialWindows: WorkWindow[] = []) {
    for (const window of initialWindows) {
      this.windows.set(window.id, { ...window })
    }
  }

  save(window: WorkWindow): Promise<void> {
    this.windows.set(window.id, { ...window })

    return Promise.resolve()
  }

  findByDate(date: Date): Promise<WorkWindow[]> {
    const targetDate = toIsoDate(date)

    return Promise.resolve(
      [...this.windows.values()]
        .filter((window) => window.date === targetDate)
        .sort((left, right) => left.start.localeCompare(right.start)),
    )
  }

  delete(id: string): Promise<void> {
    this.windows.delete(id)

    return Promise.resolve()
  }
}
