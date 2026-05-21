import type { WorkPeriod } from '../repositories/types'

function hhmm(time: string): string {
  return time.slice(0, 5)
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

  let changed = true
  while (changed) {
    changed = false
    for (const p of existing) {
      if (absorbed.includes(p.id) || p.id === incoming.id) continue
      // p ends exactly where merged starts
      if (p.end !== null && hhmm(p.end) === hhmm(merged.start)) {
        merged = { ...merged, start: p.start }
        absorbed.push(p.id)
        changed = true
        break
      }
      // merged ends exactly where p starts
      if (merged.end !== null && hhmm(merged.end) === hhmm(p.start)) {
        merged = { ...merged, end: p.end }
        absorbed.push(p.id)
        changed = true
        break
      }
    }
  }

  return { merged, absorbed }
}
