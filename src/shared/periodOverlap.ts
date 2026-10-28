import type { WorkPeriod } from '../infra/repositories/types'
import { isPlannedStop, parseMinutes } from './worktime'
import { withPeriodTimes } from './periodTimes'

const END_OF_DAY = 24 * 60

// An open period has no end yet and may run until midnight.
const endMinutes = (end: string | null) => (end === null ? END_OF_DAY : parseMinutes(end))

function findOverlappingPeriod(
  windows: WorkPeriod[],
  start: string,
  end: string | null,
  excludeId?: string,
): WorkPeriod | undefined {
  const s = parseMinutes(start)
  const e = endMinutes(end)
  return windows.find((w) => w.id !== excludeId && parseMinutes(w.start) < e && s < endMinutes(w.end))
}

/** Starting to track during a counting-down Planned-Stop ends that period at the new start, so the two never overlap. */
export function endPlannedStopsAt(windows: WorkPeriod[], start: string, now: string): WorkPeriod[] {
  const at = parseMinutes(start)
  return windows.map((w) =>
    isPlannedStop(w, now) && parseMinutes(w.start) < at && at < endMinutes(w.end)
      ? withPeriodTimes(w, w.start, start)
      : w,
  )
}

const overlapMessage = (w: WorkPeriod) => `Overlaps ${w.start}–${w.end ?? 'now'}`

export function startConflict(windows: WorkPeriod[], start: string, now: string): string | null {
  if (parseMinutes(start) > parseMinutes(now)) return "Start can't be in the future"
  const hit = findOverlappingPeriod(endPlannedStopsAt(windows, start, now), start, null)
  return hit ? overlapMessage(hit) : null
}

export function rangeConflict(
  windows: WorkPeriod[],
  start: string,
  end: string | null,
  excludeId?: string,
): string | null {
  const hit = findOverlappingPeriod(windows, start, end, excludeId)
  return hit ? overlapMessage(hit) : null
}
