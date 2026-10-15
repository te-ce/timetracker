import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { elapsedHours, isPlannedStop, parseMinutes } from '../../shared/worktime'
import { isLiveSubtask } from './workPeriodShared'
import { findSubtaskOverlaps } from './overlapRepair'

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

function isPeriodRunning(period: WorkPeriod, now: string, isToday: boolean): boolean {
  // A Planned-Stop WorkPeriod (end still in the future) is running just like an
  // open one: it only accrues up to now, but keeps showing its declared end.
  // Nothing runs on another day: an open period there was never stopped.
  return isToday && (period.end === null || isPlannedStop(period, now))
}

function sortedStartedSubtasks(period: WorkPeriod): (WorkPeriodSubtask & { startedAt: string })[] {
  return period.subtasks
    .filter((s): s is WorkPeriodSubtask & { startedAt: string } => !!s.startedAt)
    .toSorted((a, b) => parseMinutes(a.startedAt) - parseMinutes(b.startedAt))
}

function pushMainSegment(
  segments: DaySegment[],
  period: WorkPeriod,
  mainIndex: number,
  start: string,
  end: string,
  live: boolean,
): boolean {
  const hours = elapsedHours(start, end)
  if (hours <= 0) return false
  segments.push({
    id: `${period.id}:main:${mainIndex}`,
    periodId: period.id,
    category: period.category,
    start,
    end: live ? period.end : end,
    hours,
    kind: 'main',
    live,
    placed: true,
  })
  return true
}

function clampTime(time: string, from: string, to: string): string {
  if (parseMinutes(time) < parseMinutes(from)) return from
  if (parseMinutes(time) > parseMinutes(to)) return to
  return time
}

/**
 * Places each started subtask on the timeline, filling the gaps before it with
 * main stretches. A subtask only counts the time inside its period: a live one
 * runs to the period's end, and one stored past either edge is clamped to it.
 */
function placeStartedSubtasks(
  segments: DaySegment[],
  period: WorkPeriod,
  started: (WorkPeriodSubtask & { startedAt: string })[],
  live: WorkPeriodSubtask | undefined,
  periodEnd: string,
): { cursor: string; mainIndex: number } {
  let cursor = period.start
  let mainIndex = 0
  for (const subtask of started) {
    const from = clampTime(subtask.startedAt, period.start, periodEnd)
    const to = clampTime(subtask.stoppedAt ?? periodEnd, from, periodEnd)
    if (parseMinutes(from) > parseMinutes(cursor)) {
      if (pushMainSegment(segments, period, mainIndex, cursor, from, false)) mainIndex++
    }
    segments.push({
      id: subtask.id,
      periodId: period.id,
      category: subtask.category,
      start: subtask.startedAt,
      end: subtask === live ? null : (subtask.stoppedAt ?? to),
      hours: elapsedHours(from, to),
      kind: 'subtask',
      live: subtask === live,
      placed: true,
      subtask,
      note: subtask.note,
    })
    if (parseMinutes(to) > parseMinutes(cursor)) cursor = to
  }
  return { cursor, mainIndex }
}

/** Retro-logged subtasks have no clock time — carve their hours off the main stretches, then list them. */
function placeRetroSubtasks(segments: DaySegment[], period: WorkPeriod): void {
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
}

export function deriveSegments(period: WorkPeriod, now: string, { isToday = true }: SegmentOptions = {}): DaySegment[] {
  const running = isPeriodRunning(period, now, isToday)
  const periodEnd = running ? now : period.end
  // Never stopped on a day that is over: it counts 0 until its end is filled in.
  if (periodEnd === null) return []
  const segments: DaySegment[] = []

  const live = running ? period.subtasks.find(isLiveSubtask) : undefined
  const started = sortedStartedSubtasks(period)
  const { cursor, mainIndex } = placeStartedSubtasks(segments, period, started, live, periodEnd)

  if (parseMinutes(periodEnd) > parseMinutes(cursor)) {
    pushMainSegment(segments, period, mainIndex, cursor, periodEnd, running && !live)
  }

  placeRetroSubtasks(segments, period)

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
  const overlapping = new Set<string>()
  for (const { earlier, later } of findSubtaskOverlaps(period)) {
    overlapping.add(earlier.id)
    overlapping.add(later.id)
  }

  const running = period.end === null || (isToday && isPlannedStop(period, now))
  const subtasked = period.subtasks.reduce((sum, s) => sum + s.hours, 0)
  const duration = elapsedHours(period.start, period.end ?? now)
  const overbookedBy = !running && subtasked > duration + 0.001 ? subtasked - duration : 0

  return { overlappingSubtaskIds: [...overlapping], overbookedBy }
}
