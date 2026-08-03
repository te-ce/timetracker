// PROTOTYPE — throwaway UX exploration for the day-view WorkPeriod list and
// start/stop tracking controls. Delete this whole directory once a direction is
// picked; do not ship any variant as-is.
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'
import type { MonthRepository, WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { mergeAdjacentInto } from '../../infra/repositories/work-period-merge'
import { useWorkPeriodMutations } from '../../features/day/useWorkPeriodMutations'
import { isLiveSubtask } from '../../features/day/workPeriodShared'
import { elapsedHours, nowHHMM, parseMinutes } from '../../shared/worktime'

export interface ProtoActions {
  startNow: (category: string, at?: string) => void
  addPeriod: (start: string, end: string | null, category: string) => void
  stop: (period: WorkPeriod, endTime?: string) => void
  setTimes: (period: WorkPeriod, start: string, end: string | null) => void
  setCategory: (periodId: string, category: string) => void
  remove: (periodId: string) => void
  switchTo: (category: string) => void
  startSubtaskNow: (periodId: string, category: string) => void
  stopSubtaskNow: (periodId: string, subtaskId: string) => void
  removeSubtask: (periodId: string, subtaskId: string) => void
}

export interface VariantProps {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  defaultCategory: string
  nowTime: string
}

export function useProtoActions(repository: MonthRepository, date: string, windows: WorkPeriod[]): ProtoActions {
  const m = useWorkPeriodMutations(repository)

  function add(start: string, end: string | null, category: string) {
    const incoming: WorkPeriod = { id: crypto.randomUUID(), start, end, category, subtasks: [] }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    m.saveWithAbsorbed.mutate({ date, window: merged, absorbed })
  }

  function stop(period: WorkPeriod, endTime = nowHHMM()) {
    const live = period.subtasks.find(isLiveSubtask)
    m.stopPeriod.mutate({
      date,
      periodId: period.id,
      endTime,
      liveSubtaskId: live?.id,
      stoppedAt: live ? endTime : undefined,
    })
  }

  return {
    startNow: (category, at = nowHHMM()) => add(at, null, category),
    addPeriod: (start, end, category) => add(start, end, category),
    stop,
    setTimes: (period, start, end) =>
      m.saveWithAbsorbed.mutate({ date, window: { ...period, start, end }, absorbed: [] }),
    setCategory: (periodId, category) => m.setPeriodCategory.mutate({ date, periodId, category }),
    remove: (periodId) => m.remove.mutate({ date, id: periodId }),
    switchTo: (category) => {
      const at = nowHHMM()
      const open = windows.find((w) => w.end === null)
      if (open) {
        if (open.category === category) return
        stop(open, at)
      }
      add(at, null, category)
    },
    startSubtaskNow: (periodId, category) => {
      const subtask: WorkPeriodSubtask & { startedAt: string } = {
        id: crypto.randomUUID(),
        category,
        hours: 0,
        startedAt: nowHHMM(),
      }
      m.startLiveSubtask.mutate({ date, periodId, subtask })
    },
    stopSubtaskNow: (periodId, subtaskId) =>
      m.stopLiveSubtask.mutate({ date, periodId, subtaskId, stoppedAt: nowHHMM() }),
    removeSubtask: (periodId, subtaskId) => m.deleteSubtask.mutate({ date, periodId, subtaskId }),
  }
}

export function periodDuration(w: WorkPeriod, nowTime: string): number {
  return elapsedHours(w.start, w.end ?? nowTime, { raceToleranceMinutes: 5 })
}

export function sortedPeriods(windows: WorkPeriod[]): WorkPeriod[] {
  return windows.toSorted((a, b) => a.start.localeCompare(b.start))
}

export function categoryTotals(windows: WorkPeriod[], nowTime: string): Map<string, number> {
  const totals = new Map<string, number>()
  function add(category: string, hours: number) {
    totals.set(category, (totals.get(category) ?? 0) + hours)
  }
  for (const w of windows) {
    const carved = w.subtasks.reduce(
      (sum, s) => sum + (isLiveSubtask(s) ? elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }) : s.hours),
      0,
    )
    add(w.category, Math.max(0, periodDuration(w, nowTime) - carved))
    for (const s of w.subtasks) {
      add(s.category, isLiveSubtask(s) ? elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }) : s.hours)
    }
  }
  return totals
}

export interface Gap {
  start: string
  end: string
  hours: number
}

export function findGaps(windows: WorkPeriod[]): Gap[] {
  const closed = sortedPeriods(windows).filter((w) => w.end !== null)
  const gaps: Gap[] = []
  for (let i = 0; i < closed.length - 1; i++) {
    const a = closed[i]
    const b = closed[i + 1]
    if (!a?.end || !b) continue
    const hours = elapsedHours(a.end, b.start)
    if (parseMinutes(b.start) > parseMinutes(a.end) && hours > 0) {
      gaps.push({ start: a.end, end: b.start, hours })
    }
  }
  return gaps
}

/** Human label for a category, keeping the `_UNCATEGORIZED` sentinel readable. */
export function categoryLabel(category: string): string {
  return category === UNCATEGORIZED_CATEGORY ? 'Uncategorized' : category
}

export function isUncategorized(category: string): boolean {
  return category === UNCATEGORIZED_CATEGORY
}

/** Selectable options always include the uncategorized sentinel, like CategoryPicker does. */
export function withUncategorized(categories: string[]): string[] {
  return categories.includes(UNCATEGORIZED_CATEGORY) ? categories : [UNCATEGORIZED_CATEGORY, ...categories]
}

/** Options for a select bound to `current`, so a category dropped from settings still shows. */
export function optionsFor(current: string, categories: string[]): string[] {
  return categories.includes(current) ? categories : [current, ...categories]
}
