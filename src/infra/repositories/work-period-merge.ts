import type { WorkPeriod, WorkPeriodSubtask } from './types'
import { calculateWorkedHours } from '../../shared/worktime'
import { remainderHours } from '../../shared/periodCategories'

function hhmm(time: string): string {
  return time.slice(0, 5)
}

function collectSubtasksFromAbsorbed(merged: WorkPeriod, absorbed: WorkPeriod): WorkPeriodSubtask[] {
  const duration = calculateWorkedHours([absorbed])
  const subtaskedHours = absorbed.subtasks.reduce((sum, s) => sum + s.hours, 0)
  const remainder = remainderHours(duration, subtaskedHours)
  const syntheticSubtask: WorkPeriodSubtask[] =
    absorbed.category !== merged.category && remainder > 0.001
      ? [{ id: crypto.randomUUID(), category: absorbed.category, hours: remainder }]
      : []
  return [...merged.subtasks, ...absorbed.subtasks, ...syntheticSubtask]
}

/**
 * Given a list of existing periods and one incoming period, returns
 * the transitively merged result plus the ids of periods to delete.
 * Merges when end HH:MM of one period equals start HH:MM of another.
 */
export function mergeAdjacentInto(
  existing: WorkPeriod[],
  incoming: WorkPeriod,
): { merged: WorkPeriod; absorbed: string[] } {
  let merged = { ...incoming }
  const absorbed: string[] = []
  const absorbedIds = new Set<string>()

  let changed = true
  while (changed) {
    changed = false
    for (const p of existing) {
      if (absorbedIds.has(p.id) || p.id === incoming.id) continue
      // p ends exactly where merged starts
      if (p.end !== null && hhmm(p.end) === hhmm(merged.start)) {
        merged = { ...merged, start: p.start, subtasks: collectSubtasksFromAbsorbed(merged, p) }
        absorbed.push(p.id)
        absorbedIds.add(p.id)
        changed = true
        break
      }
      // merged ends exactly where p starts
      if (merged.end !== null && hhmm(merged.end) === hhmm(p.start)) {
        merged = { ...merged, end: p.end, subtasks: collectSubtasksFromAbsorbed(merged, p) }
        absorbed.push(p.id)
        absorbedIds.add(p.id)
        changed = true
        break
      }
    }
  }

  return { merged, absorbed }
}
