import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { elapsedHours, isPlannedStop, parseMinutes } from '../../shared/worktime'
import { isLiveSubtask, isTimedSubtask } from './workPeriodShared'

/**
 * A contiguous stretch inside a WorkPeriod attributed to a single category —
 * either the period's own (main) category or a subtask that interrupted it.
 */
export interface DaySegment {
  id: string
  periodId: string
  category: string
  start: string | null
  /** null while the segment is still running. */
  end: string | null
  hours: number
  kind: 'main' | 'subtask'
  live: boolean
  /**
   * False for a subtask that was logged from memory: it has a duration but no
   * times, so it cannot be placed on the clock. Its hours are taken off the
   * surrounding main stretch instead.
   */
  placed: boolean
  subtask?: WorkPeriodSubtask | undefined
  note?: string | undefined
}

/** Retro-logged hours came out of the period's own category — take them off the latest main stretches. */
function carveFromMain(segments: DaySegment[], hours: number): void {
  let remaining = hours
  for (let i = segments.length - 1; i >= 0 && remaining > 0.0001; i--) {
    const segment = segments[i]
    if (!segment || segment.kind !== 'main') continue
    const taken = Math.min(segment.hours, remaining)
    segment.hours -= taken
    remaining -= taken
  }
}

export interface SegmentOptions {
  /** A Planned-Stop WorkPeriod only counts as running on today's day (ADR 0009). */
  isToday?: boolean
}

export function deriveSegments(period: WorkPeriod, now: string, { isToday = true }: SegmentOptions = {}): DaySegment[] {
  // A Planned-Stop WorkPeriod (end still in the future) is running just like an
  // open one: it only accrues up to now, but keeps showing its declared end.
  const running = period.end === null || (isToday && isPlannedStop(period, now))
  const accrueUntil = running ? now : period.end
  const periodEnd = accrueUntil ?? now
  const segments: DaySegment[] = []
  let mainIndex = 0
  let cursor = period.start

  function pushMain(start: string, end: string, live: boolean) {
    const hours = elapsedHours(start, end, { raceToleranceMinutes: 5 })
    if (hours <= 0) return
    segments.push({
      id: `${period.id}:main:${mainIndex++}`,
      periodId: period.id,
      category: period.category,
      start,
      end: live ? period.end : end,
      hours,
      kind: 'main',
      live,
      placed: true,
    })
  }

  const live = period.subtasks.find(isLiveSubtask)
  const started = period.subtasks
    .filter((s): s is WorkPeriodSubtask & { startedAt: string } => !!s.startedAt)
    .toSorted((a, b) => parseMinutes(a.startedAt) - parseMinutes(b.startedAt))

  for (const subtask of started) {
    const stoppedAt = subtask.stoppedAt ?? now
    if (parseMinutes(subtask.startedAt) > parseMinutes(cursor)) pushMain(cursor, subtask.startedAt, false)
    segments.push({
      id: subtask.id,
      periodId: period.id,
      category: subtask.category,
      start: subtask.startedAt,
      end: subtask.stoppedAt ?? null,
      hours: elapsedHours(subtask.startedAt, stoppedAt, { raceToleranceMinutes: 5 }),
      kind: 'subtask',
      live: subtask === live,
      placed: true,
      subtask,
      note: subtask.note,
    })
    if (parseMinutes(stoppedAt) > parseMinutes(cursor)) cursor = stoppedAt
  }

  if (parseMinutes(periodEnd) > parseMinutes(cursor)) pushMain(cursor, periodEnd, running && !live)

  const retro = period.subtasks.filter((s) => !s.startedAt)
  carveFromMain(
    segments,
    retro.reduce((sum, s) => sum + s.hours, 0),
  )
  for (const subtask of retro) {
    segments.push({
      id: subtask.id,
      periodId: period.id,
      category: subtask.category,
      start: null,
      end: null,
      hours: subtask.hours,
      kind: 'subtask',
      live: false,
      placed: false,
      subtask,
      note: subtask.note,
    })
  }

  return segments
}

export interface PeriodWarnings {
  /** Ids of timed subtasks that share clock time with another subtask. */
  overlappingSubtaskIds: string[]
  /** Hours by which the subtasks exceed a finished period; 0 while it is running. */
  overbookedBy: number
}

export function derivePeriodWarnings(
  period: WorkPeriod,
  now: string,
  { isToday = true }: SegmentOptions = {},
): PeriodWarnings {
  const timed = period.subtasks.filter(isTimedSubtask)
  const overlapping = new Set<string>()
  timed.forEach((a, i) => {
    for (const b of timed.slice(i + 1)) {
      const overlaps =
        parseMinutes(a.startedAt) < parseMinutes(b.stoppedAt) && parseMinutes(b.startedAt) < parseMinutes(a.stoppedAt)
      if (overlaps) {
        overlapping.add(a.id)
        overlapping.add(b.id)
      }
    }
  })

  const running = period.end === null || (isToday && isPlannedStop(period, now))
  const subtasked = period.subtasks.reduce((sum, s) => sum + s.hours, 0)
  const duration = elapsedHours(period.start, period.end ?? now, { raceToleranceMinutes: 5 })
  const overbookedBy = !running && subtasked > duration + 0.001 ? subtasked - duration : 0

  return { overlappingSubtaskIds: [...overlapping], overbookedBy }
}
