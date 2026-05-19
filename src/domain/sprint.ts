import type { TimeEntry } from '../repositories/types'

export interface SprintConfig {
  startDate: string
  lengthDays: number
}

export interface Sprint {
  index: number
  start: string
  end: string
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getSprintBoundaries(index: number, config: SprintConfig): Sprint {
  const start = addDays(config.startDate, index * config.lengthDays)
  const end = addDays(start, config.lengthDays - 1)
  return { index, start, end }
}

export function getSprintForDate(date: string, config: SprintConfig): Sprint {
  const msPerDay = 86_400_000
  const daysSinceStart = Math.floor(
    (new Date(date).getTime() - new Date(config.startDate).getTime()) / msPerDay,
  )
  const index = Math.floor(daysSinceStart / config.lengthDays)
  return getSprintBoundaries(index, config)
}

export function aggregateSprintHours(
  entries: TimeEntry[],
  sprint: Sprint,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const entry of entries) {
    if (entry.date >= sprint.start && entry.date <= sprint.end) {
      result[entry.category] = (result[entry.category] ?? 0) + entry.hours
    }
  }
  return result
}
