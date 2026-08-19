import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { calcSubtaskHours, parseMinutes } from '../../shared/worktime'
import { isTimedSubtask, type TimedSubtask } from './workPeriodShared'

/** Two timed subtasks of one WorkPeriod claiming the same minutes. */
export interface SubtaskOverlap {
  /** The one that starts first; on equal starts, the one that ends first. */
  earlier: TimedSubtask
  later: TimedSubtask
  /** Hours claimed twice — the amount this period inflates the day's totals by. */
  hours: number
}

/**
 * A single write that removes one overlap. Kept as data rather than a closure so
 * the suggestion and its effect can be tested and labelled separately.
 */
interface OverlapFixTarget {
  earlierId: string
  laterId: string
}

export type OverlapFix =
  | (OverlapFixTarget & { kind: 'trim-earlier'; at: string })
  | (OverlapFixTarget & { kind: 'delay-later'; at: string })
  | (OverlapFixTarget & { kind: 'split'; at: string })
  | (OverlapFixTarget & { kind: 'drop-later' })
  | (OverlapFixTarget & { kind: 'untime-later' })

const SNAP_MINUTES = 5

function sortedTimedSubtasks(period: WorkPeriod): TimedSubtask[] {
  return period.subtasks
    .filter(isTimedSubtask)
    .toSorted(
      (a, b) =>
        parseMinutes(a.startedAt) - parseMinutes(b.startedAt) || parseMinutes(a.stoppedAt) - parseMinutes(b.stoppedAt),
    )
}

function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function findSubtaskOverlaps(period: WorkPeriod): SubtaskOverlap[] {
  const timed = sortedTimedSubtasks(period)
  const overlaps: SubtaskOverlap[] = []
  timed.forEach((earlier, i) => {
    for (const later of timed.slice(i + 1)) {
      const from = Math.max(parseMinutes(earlier.startedAt), parseMinutes(later.startedAt))
      const to = Math.min(parseMinutes(earlier.stoppedAt), parseMinutes(later.stoppedAt))
      if (from < to) overlaps.push({ earlier, later, hours: (to - from) / 60 })
    }
  })
  return overlaps
}

/**
 * The ways out of one overlap, most likely first. A subtask that sits entirely
 * inside another cannot be fixed by moving a boundary — trimming the outer one
 * would throw away the tail past the inner one — so those get the two
 * lossless options instead.
 */
export function suggestOverlapFixes({ earlier, later }: SubtaskOverlap): OverlapFix[] {
  const ids = { earlierId: earlier.id, laterId: later.id }
  const earlierStart = parseMinutes(earlier.startedAt)
  const earlierEnd = parseMinutes(earlier.stoppedAt)
  const laterStart = parseMinutes(later.startedAt)
  const laterEnd = parseMinutes(later.stoppedAt)

  if (earlierEnd >= laterEnd)
    return [
      { kind: 'untime-later', ...ids },
      { kind: 'drop-later', ...ids },
    ]

  const fixes: OverlapFix[] = []
  if (laterStart > earlierStart) fixes.push({ kind: 'trim-earlier', ...ids, at: later.startedAt })
  fixes.push({ kind: 'delay-later', ...ids, at: earlier.stoppedAt })

  const mid = Math.round((laterStart + earlierEnd) / 2 / SNAP_MINUTES) * SNAP_MINUTES
  if (laterStart > earlierStart && mid > laterStart && mid < earlierEnd) {
    fixes.push({ kind: 'split', ...ids, at: toHHMM(mid) })
  }
  return fixes
}

function retimed(subtask: WorkPeriodSubtask, startedAt: string, stoppedAt: string): WorkPeriodSubtask {
  return { ...subtask, startedAt, stoppedAt, hours: calcSubtaskHours(startedAt, stoppedAt) }
}

export function applyOverlapFix(period: WorkPeriod, fix: OverlapFix): WorkPeriod {
  if (fix.kind === 'drop-later') {
    return { ...period, subtasks: period.subtasks.filter((s) => s.id !== fix.laterId) }
  }
  if (fix.kind === 'untime-later') {
    // Keeps the hours, drops the clock times: a duration-only subtask cannot clash.
    const subtasks = period.subtasks.map((s) =>
      s.id === fix.laterId ? { ...s, startedAt: undefined, stoppedAt: undefined } : s,
    )
    return { ...period, subtasks }
  }
  const { at } = fix
  const subtasks = period.subtasks.map((s) => {
    if (s.id === fix.earlierId && fix.kind !== 'delay-later') return retimed(s, s.startedAt ?? '', at)
    if (s.id === fix.laterId && fix.kind !== 'trim-earlier') return retimed(s, at, s.stoppedAt ?? '')
    return s
  })
  return { ...period, subtasks }
}
