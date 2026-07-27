import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { calculateWorkedHours, isPlannedStop, parseMinutes, elapsedHours } from '../../shared/worktime'
import { remainderHours } from '../../shared/periodCategories'
import { isLiveSubtask, isTimedSubtask, type LiveSubtask } from './workPeriodShared'

export interface PeriodCardModel {
  isRunning: boolean
  canStartLiveSubtask: boolean
  liveSubtask: LiveSubtask | undefined
  completedSubtasks: WorkPeriodSubtask[]
  duration: number
  overbooked: boolean
  overlappingIds: Set<string>
  hasOverlap: boolean
  /** Remaining hours for the period's own category once subtask hours (and any live subtask so far) are carved out. */
  displayRemainder: number
}

function liveElapsedHours(liveSubtask: LiveSubtask | undefined, nowTime: string): number {
  if (!liveSubtask) return 0
  return elapsedHours(liveSubtask.startedAt, nowTime, { raceToleranceMinutes: 5 })
}

function findOverlappingIds(
  timedSubtasks: (WorkPeriodSubtask & { startedAt: string; stoppedAt: string })[],
): Set<string> {
  const overlappingIds = new Set<string>()
  timedSubtasks.forEach((a, i) => {
    timedSubtasks.slice(i + 1).forEach((b) => {
      const aStart = parseMinutes(a.startedAt)
      const aEnd = parseMinutes(a.stoppedAt)
      const bStart = parseMinutes(b.startedAt)
      const bEnd = parseMinutes(b.stoppedAt)
      if (aStart < bEnd && bStart < aEnd) {
        overlappingIds.add(a.id)
        overlappingIds.add(b.id)
      }
    })
  })
  return overlappingIds
}

export function computePeriodCardModel(w: WorkPeriod, nowTime: string): PeriodCardModel {
  const isRunning = w.end === null
  const canStartLiveSubtask = w.end === null || isPlannedStop(w, nowTime)
  const liveSubtask = w.subtasks.find(isLiveSubtask)
  const completedSubtasks = w.subtasks.filter((s) => !isLiveSubtask(s))

  const duration = calculateWorkedHours([w], isRunning ? nowTime : undefined)
  const slicedHours = completedSubtasks.reduce((s, sl) => s + sl.hours, 0)
  const remainder = remainderHours(duration, slicedHours)
  const overbooked = !isRunning && slicedHours > duration + 0.001

  const overlappingIds = findOverlappingIds(completedSubtasks.filter(isTimedSubtask))
  const hasOverlap = overlappingIds.size > 0

  const displayRemainder = remainderHours(remainder, liveElapsedHours(liveSubtask, nowTime))

  return {
    isRunning,
    canStartLiveSubtask,
    liveSubtask,
    completedSubtasks,
    duration,
    overbooked,
    overlappingIds,
    hasOverlap,
    displayRemainder,
  }
}
