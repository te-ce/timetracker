import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { calculateWorkedHours, elapsedHours, findActivePeriod, parseMinutes } from '../../shared/worktime'
import { findBreaks, type DayBreak } from './dayBreaks'
import { deriveSegments, type DaySegment } from './daySegments'
import { isLiveSubtask } from './workPeriodShared'

/**
 * What is being tracked at this moment. At most one thing in the whole day:
 * either the open WorkPeriod's own category, or the live subtask inside it.
 */
export interface ActiveTracking {
  period: WorkPeriod
  subtask: (WorkPeriodSubtask & { startedAt: string }) | undefined
  category: string
  since: string
  elapsed: number
}

export interface DayOptions {
  /** A Planned-Stop WorkPeriod only counts as running on today's day (ADR 0009). */
  isToday?: boolean
}

export function findActiveTracking(
  windows: WorkPeriod[],
  now: string,
  { isToday = true }: DayOptions = {},
): ActiveTracking | undefined {
  const ordered = orderedPeriods(windows)
  // Per ADR 0006 the latest open WorkPeriod is the current session; on today a
  // Planned-Stop WorkPeriod counts as running too (ADR 0009).
  const period = ordered.findLast((w) => w.end === null) ?? (isToday ? findActivePeriod(ordered, now) : undefined)
  if (!period) return undefined
  const subtask = period.subtasks.find(isLiveSubtask)
  const since = subtask?.startedAt ?? period.start
  return {
    period,
    subtask,
    category: subtask?.category ?? period.category,
    since,
    elapsed: elapsedHours(since, now, { raceToleranceMinutes: 5 }),
  }
}

/**
 * The day as one ordered list: each WorkPeriod announces itself, then its
 * segments follow, then the break before the next WorkPeriod.
 */
export type DayStreamItem =
  | { type: 'period'; key: string; period: WorkPeriod; ordinal: number; duration: number }
  | { type: 'segment'; key: string; segment: DaySegment; period: WorkPeriod; first: boolean; last: boolean }
  | { type: 'break'; key: string; break: DayBreak }

export function buildDayStream(windows: WorkPeriod[], now: string, options: DayOptions = {}): DayStreamItem[] {
  const ordered = orderedPeriods(windows)
  const breaksByStart = new Map(findBreaks(windows).map((b) => [b.start, b]))
  const items: DayStreamItem[] = []

  ordered.forEach((period, index) => {
    items.push({
      type: 'period',
      key: `period:${period.id}`,
      period,
      ordinal: index + 1,
      duration: calculateWorkedHours([period], options.isToday === false ? undefined : now),
    })

    const segments = deriveSegments(period, now, options)
    segments.forEach((segment, segmentIndex) => {
      items.push({
        type: 'segment',
        key: `segment:${segment.id}`,
        segment,
        period,
        first: segmentIndex === 0,
        last: segmentIndex === segments.length - 1,
      })
    })

    const nextBreak = period.end ? breaksByStart.get(period.end) : undefined
    if (nextBreak) items.push({ type: 'break', key: `break:${nextBreak.start}`, break: nextBreak })
  })

  return items
}

export interface CategoryTotal {
  category: string
  hours: number
}

export interface DayStats {
  /** WorkedHours for the day, live periods included. */
  worked: number
  breakHours: number
  breakCount: number
  /** Worked time plus breaks — how long the day has been running end to end. */
  atDesk: number
  firstStart: string | undefined
  /** End of the last closed WorkPeriod; undefined while one is still open. */
  lastStop: string | undefined
  /** Start of whatever is being tracked right now, if anything. */
  runningSince: string | undefined
  /** Hours per category, largest first. Derived from segments, so a running subtask counts already. */
  categoryTotals: CategoryTotal[]
}

function categoryTotalsFromSegments(windows: WorkPeriod[], now: string, options: DayOptions): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const period of windows) {
    for (const segment of deriveSegments(period, now, options)) {
      totals.set(segment.category, (totals.get(segment.category) ?? 0) + segment.hours)
    }
  }
  return [...totals.entries()]
    .filter(([, hours]) => hours > 0.001)
    .map(([category, hours]) => ({ category, hours }))
    .toSorted((a, b) => b.hours - a.hours)
}

export function orderedPeriods(windows: WorkPeriod[]): WorkPeriod[] {
  return windows.toSorted((a, b) => parseMinutes(a.start) - parseMinutes(b.start))
}

export function deriveDayStats(windows: WorkPeriod[], now: string, options: DayOptions = {}): DayStats {
  const ordered = orderedPeriods(windows)
  const breaks = findBreaks(windows)
  const breakHours = breaks.reduce((sum, b) => sum + b.hours, 0)
  const worked = calculateWorkedHours(windows, options.isToday === false ? undefined : now)
  const active = findActiveTracking(windows, now, options)

  return {
    worked,
    breakHours,
    breakCount: breaks.length,
    atDesk: worked + breakHours,
    firstStart: ordered[0]?.start,
    lastStop: active ? undefined : (ordered.at(-1)?.end ?? undefined),
    runningSince: active?.since,
    categoryTotals: categoryTotalsFromSegments(windows, now, options),
  }
}
