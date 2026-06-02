import type { Day, TimeEntry, WorkPeriod } from '../repositories/types'

export function upsertEntry(day: Day, entry: TimeEntry): Day {
  return { ...day, entries: [...day.entries.filter((e) => e.id !== entry.id), entry] }
}

export function removeEntry(day: Day, id: string): Day {
  return { ...day, entries: day.entries.filter((e) => e.id !== id) }
}

export function upsertWindow(day: Day, window: WorkPeriod): Day {
  return { ...day, windows: [...day.windows.filter((w) => w.id !== window.id), window] }
}

export function removeWindow(day: Day, id: string): Day {
  return { ...day, windows: day.windows.filter((w) => w.id !== id) }
}
