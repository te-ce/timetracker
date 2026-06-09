import type { WorkPeriod } from '../infra/repositories/types'

export type Restarbeitszeit = {
  value: number
  isOvertime: boolean
}

export function hasOpenPeriod(windows: WorkPeriod[]): boolean {
  return windows.some((w) => w.end === null)
}

export function findOpenPeriod(windows: WorkPeriod[]): WorkPeriod | undefined {
  return windows.find((w) => w.end === null)
}

function parseMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return h * 60 + m
}

/**
 * Returns true when the period has a non-null end that is still in the future
 * relative to nowHHMM (i.e. the period is a Planned-Stop WorkPeriod).
 */
export function isPlannedStop(period: WorkPeriod, nowHHMM: string): boolean {
  if (period.end === null) return false
  return parseMinutes(period.end) > parseMinutes(nowHHMM)
}

/**
 * Returns the first WorkPeriod whose end is a future time (Planned-Stop WorkPeriod).
 */
export function findPlannedStopPeriod(windows: WorkPeriod[], nowHHMM: string): WorkPeriod | undefined {
  return windows.find((w) => isPlannedStop(w, nowHHMM))
}

/**
 * Calculates projected total worked hours for today.
 * Planned-Stop periods contribute their full planned duration (end − start).
 * Open periods (end: null) contribute live elapsed (now − start).
 * Closed past periods contribute their fixed duration.
 */
export function calculateProjectedWorkedHours(windows: WorkPeriod[], nowHHMM: string): number {
  return windows.reduce((total, w) => {
    const endTime = w.end ?? nowHHMM
    const start = parseMinutes(w.start)
    let end = parseMinutes(endTime)
    if (end < start) end += 24 * 60
    return total + (end - start) / 60
  }, 0)
}

export function calculateWorkedHours(windows: WorkPeriod[], now?: string): number {
  return windows.reduce((total, w) => {
    // When now is provided, treat a future end as live (use now instead of end).
    const isFuturePlannedStop = w.end !== null && now !== undefined && parseMinutes(w.end) > parseMinutes(now)
    const endTime = w.end === null || isFuturePlannedStop ? now : w.end
    if (endTime == null) return total
    const start = parseMinutes(w.start)
    const end = parseMinutes(endTime)
    const diff = end - start
    // If now is slightly behind the period's start (minute-boundary race between
    // nowTime tick and work period creation), treat as zero rather than wrapping.
    if (diff < 0 && diff > -5) return total
    const adjusted = diff < 0 ? diff + 24 * 60 : diff // true midnight-spanning
    return total + adjusted / 60
  }, 0)
}

export function calcSubtaskHours(startedAt: string, stoppedAt: string): number {
  const startMins = parseMinutes(startedAt)
  let endMins = parseMinutes(stoppedAt)
  if (endMins < startMins) endMins += 24 * 60
  return (endMins - startMins) / 60
}

export function calculateRestarbeitszeit(sollstunden: number, workedHours: number): Restarbeitszeit {
  const value = sollstunden - workedHours
  return { value, isOvertime: value < 0 }
}
