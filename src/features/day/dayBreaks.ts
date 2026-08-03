import type { WorkPeriod } from '../../infra/repositories/types'
import { elapsedHours, parseMinutes } from '../../shared/worktime'

/** A stretch of the day between two WorkPeriods — time at the desk that was not worked. */
export interface DayBreak {
  start: string
  end: string
  hours: number
}

export function findBreaks(windows: WorkPeriod[]): DayBreak[] {
  const ordered = windows.toSorted((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
  const breaks: DayBreak[] = []

  let coveredUntil: string | null = null

  for (const period of ordered) {
    if (coveredUntil && parseMinutes(period.start) > parseMinutes(coveredUntil)) {
      breaks.push({
        start: coveredUntil,
        end: period.start,
        hours: elapsedHours(coveredUntil, period.start),
      })
    }
    if (period.end && (!coveredUntil || parseMinutes(period.end) > parseMinutes(coveredUntil))) {
      coveredUntil = period.end
    }
  }

  return breaks
}
