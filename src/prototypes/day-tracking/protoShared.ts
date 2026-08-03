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
  /** Retroactively log a subtask that was never tracked — duration only, no times. */
  logSubtask: (periodId: string, category: string, hours: number) => void
  setSubtaskCategory: (periodId: string, subtask: WorkPeriodSubtask, category: string) => void
  setSubtaskHours: (periodId: string, subtask: WorkPeriodSubtask, hours: number) => void
  setSubtaskTimes: (periodId: string, subtask: WorkPeriodSubtask, startedAt: string, stoppedAt: string) => void
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
    logSubtask: (periodId, category, hours) =>
      m.addSubtask.mutate({ date, periodId, subtask: { id: crypto.randomUUID(), category, hours } }),
    setSubtaskCategory: (periodId, subtask, category) =>
      m.addSubtask.mutate({ date, periodId, subtask: { ...subtask, category } }),
    setSubtaskHours: (periodId, subtask, hours) =>
      m.addSubtask.mutate({ date, periodId, subtask: { ...subtask, hours } }),
    setSubtaskTimes: (periodId, subtask, startedAt, stoppedAt) =>
      m.addSubtask.mutate({
        date,
        periodId,
        subtask: { ...subtask, startedAt, stoppedAt, hours: elapsedHours(startedAt, stoppedAt) },
      }),
  }
}

/** Hours still attributed to the period's own category once every subtask is carved out. */
export function mainRemainder(w: WorkPeriod, nowTime: string): number {
  const carved = w.subtasks.reduce((sum, s) => sum + subtaskHours(s, nowTime), 0)
  return Math.max(0, periodDuration(w, nowTime) - carved)
}

export function subtaskHours(s: WorkPeriodSubtask, nowTime: string): number {
  return isLiveSubtask(s) ? elapsedHours(s.startedAt, nowTime, { raceToleranceMinutes: 5 }) : s.hours
}

/**
 * What is being tracked right this second — at most one thing in the whole day:
 * either an open period's own category, or the live subtask inside it.
 */
export interface ActiveTracking {
  period: WorkPeriod
  subtask: (WorkPeriodSubtask & { startedAt: string }) | undefined
  category: string
  since: string
  elapsed: number
}

export function findActiveTracking(windows: WorkPeriod[], nowTime: string): ActiveTracking | undefined {
  const period = windows.find((w) => w.end === null)
  if (!period) return undefined
  const subtask = period.subtasks.find(isLiveSubtask)
  const since = subtask?.startedAt ?? period.start
  return {
    period,
    subtask,
    category: subtask?.category ?? period.category,
    since,
    elapsed: elapsedHours(since, nowTime, { raceToleranceMinutes: 5 }),
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

/**
 * Because only one thing can ever be tracked at a time, a day is really a flat
 * chain of segments: stretches of the period's own category interleaved with the
 * timed subtasks that interrupted it. Retroactively logged subtasks carry no
 * times, so they can't be placed in the chain — they come back as `placed: false`
 * and are carved out of the surrounding main stretch's hours instead.
 */
export interface Segment {
  key: string
  periodId: string
  category: string
  /** null only for unplaced (duration-only) subtasks. */
  start: string | null
  /** null while live. */
  end: string | null
  hours: number
  kind: 'main' | 'subtask'
  live: boolean
  placed: boolean
  subtask?: WorkPeriodSubtask | undefined
  note?: string | undefined
}

function clampInterval(start: string, end: string, lo: string, hi: string): [string, string] | null {
  const s = Math.max(parseMinutes(start), parseMinutes(lo))
  const e = Math.min(parseMinutes(end), parseMinutes(hi))
  if (e <= s) return null
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return [fmt(s), fmt(e)]
}

export function deriveSegments(w: WorkPeriod, nowTime: string): Segment[] {
  const periodEnd = w.end ?? nowTime
  const live = w.subtasks.find(isLiveSubtask)
  const placed: { subtask: WorkPeriodSubtask; start: string; end: string; live: boolean }[] = []

  for (const s of w.subtasks) {
    if (!s.startedAt) continue
    const stop = s.stoppedAt ?? nowTime
    const clamped = clampInterval(s.startedAt, stop, w.start, periodEnd)
    if (!clamped) continue
    placed.push({ subtask: s, start: clamped[0], end: clamped[1], live: s === live })
  }
  placed.sort((a, b) => a.start.localeCompare(b.start))

  const unplaced = w.subtasks.filter((s) => !s.startedAt)
  const unplacedHours = unplaced.reduce((sum, s) => sum + s.hours, 0)

  const segments: Segment[] = []
  let cursor = w.start
  let mainIndex = 0

  function pushMain(start: string, end: string, isLiveTail: boolean) {
    const hours = elapsedHours(start, end, { raceToleranceMinutes: 5 })
    if (hours <= 0) return
    segments.push({
      key: `${w.id}:main:${mainIndex++}`,
      periodId: w.id,
      category: w.category,
      start,
      end: isLiveTail ? null : end,
      hours,
      kind: 'main',
      live: isLiveTail,
      placed: true,
    })
  }

  for (const p of placed) {
    if (parseMinutes(p.start) > parseMinutes(cursor)) pushMain(cursor, p.start, false)
    segments.push({
      key: p.subtask.id,
      periodId: w.id,
      category: p.subtask.category,
      start: p.start,
      end: p.live ? null : p.end,
      hours: elapsedHours(p.start, p.end, { raceToleranceMinutes: 5 }),
      kind: 'subtask',
      live: p.live,
      placed: true,
      subtask: p.subtask,
      note: p.subtask.note,
    })
    if (parseMinutes(p.end) > parseMinutes(cursor)) cursor = p.end
  }
  if (parseMinutes(periodEnd) > parseMinutes(cursor)) {
    pushMain(cursor, periodEnd, w.end === null && !live)
  }

  // Duration-only subtasks were carved out of the period's own category, so take
  // their hours off the main stretches (latest first) to keep the sum honest.
  let toCarve = unplacedHours
  for (let i = segments.length - 1; i >= 0 && toCarve > 0.0001; i--) {
    const seg = segments[i]
    if (!seg || seg.kind !== 'main') continue
    const take = Math.min(seg.hours, toCarve)
    seg.hours -= take
    toCarve -= take
  }

  for (const s of unplaced) {
    segments.push({
      key: s.id,
      periodId: w.id,
      category: s.category,
      start: null,
      end: null,
      hours: s.hours,
      kind: 'subtask',
      live: false,
      placed: false,
      subtask: s,
      note: s.note,
    })
  }

  return segments
}
