import type { WorkPeriod } from '../infra/repositories/types'

export function hasOpenPeriod(windows: WorkPeriod[]): boolean {
  return windows.some((w) => w.end === null)
}

export function findOpenPeriod(windows: WorkPeriod[]): WorkPeriod | undefined {
  return windows.find((w) => w.end === null)
}

export function parseMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  return h * 60 + m
}

export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export interface ElapsedHoursOptions {
  /**
   * Tolerate `now` landing up to this many minutes before `start` — treated as
   * zero rather than wrapped to (almost) 24h. Covers the race between a
   * minute-tick and the moment a live period/subtask is created.
   */
  raceToleranceMinutes?: number
}

/**
 * Minutes between `start` and `end` (both "HH:MM"), in hours, wrapping past
 * midnight when `end` is earlier than `start`.
 */
export function elapsedHours(start: string, end: string, options: ElapsedHoursOptions = {}): number {
  const raceToleranceMinutes = options.raceToleranceMinutes ?? 0
  const startMins = parseMinutes(start)
  const endMins = parseMinutes(end)
  const diff = endMins - startMins
  if (diff < 0 && diff > -raceToleranceMinutes) return 0
  const adjusted = diff < 0 ? diff + 24 * 60 : diff
  return adjusted / 60
}

export function parseDurationInput(raw: string): number | null {
  const trimmed = raw.trim()
  const hhmmMatch = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1] ?? '0')
    const m = parseInt(hhmmMatch[2] ?? '0')
    return h + m / 60
  }
  const num = parseFloat(trimmed)
  if (!isNaN(num) && num > 0) return num
  return null
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
 * Returns the WorkPeriod that is currently live-tracked — either fully open
 * (end: null) or a Planned-Stop WorkPeriod whose declared end hasn't passed yet.
 * Both are "still running" from the user's perspective; callers that ask
 * "is tracking active right now" should use this rather than `end === null`.
 */
export function findActivePeriod(windows: WorkPeriod[], nowHHMM: string): WorkPeriod | undefined {
  return findOpenPeriod(windows) ?? findPlannedStopPeriod(windows, nowHHMM)
}

/**
 * Calculates projected total worked hours for today.
 * Planned-Stop periods contribute their full planned duration (end − start).
 * Open periods (end: null) contribute live elapsed (now − start).
 * Closed past periods contribute their fixed duration.
 */
export function calculateProjectedWorkedHours(windows: WorkPeriod[], nowHHMM: string): number {
  return windows.reduce((total, w) => total + elapsedHours(w.start, w.end ?? nowHHMM), 0)
}

export function calculateWorkedHours(windows: WorkPeriod[], now?: string): number {
  return windows.reduce((total, w) => {
    // When now is provided, treat a future end as live (use now instead of end).
    const isFuturePlannedStop = w.end !== null && now !== undefined && parseMinutes(w.end) > parseMinutes(now)
    const endTime = w.end === null || isFuturePlannedStop ? now : w.end
    if (endTime == null) return total
    return total + elapsedHours(w.start, endTime, { raceToleranceMinutes: 5 })
  }, 0)
}

export interface PlannedStopState {
  isPlannedStopMode: boolean
  plannedStopTime: string | null
  countdownHours: number
}

/**
 * Derives whether "remaining" should count down to a planned-stop period's end
 * rather than the usual target/overtime subtraction. Shared by useRemainingHours
 * (badge/tray) and DayView (overtime bar) so all three stay in sync.
 */
export function derivePlannedStopState(
  windows: WorkPeriod[],
  nowHHMM: string,
  remainingTimeReference: 'planned-stop' | 'target-hours',
): PlannedStopState {
  const plannedStopPeriod = findPlannedStopPeriod(windows, nowHHMM)
  const isPlannedStopMode = !!plannedStopPeriod && remainingTimeReference !== 'target-hours'
  const plannedStopTime = plannedStopPeriod?.end ?? null
  const countdownHours = plannedStopPeriod ? (parseMinutes(plannedStopPeriod.end!) - parseMinutes(nowHHMM)) / 60 : 0
  return { isPlannedStopMode, plannedStopTime, countdownHours }
}

export function calcSubtaskHours(startedAt: string, stoppedAt: string): number {
  return elapsedHours(startedAt, stoppedAt)
}
