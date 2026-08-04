import type { WorkPeriod } from '../infra/repositories/types'
import { calculateRemaining, type RemainingTimeMode } from './remainingCalc'
import {
  calculateProjectedWorkedHours,
  derivePlannedStopState,
  elapsedHours,
  findOpenPeriod,
  findPlannedStopPeriod,
  isPlannedStop,
} from './worktime'

export interface DayBalanceInput {
  windows: WorkPeriod[]
  sollstunden: number
  priorOvertime: number
  now: string
  /** A planned stop only makes sense on today's day — past days already happened. */
  isToday: boolean
  remainingTimeReference: 'planned-stop' | 'target-hours'
  remainingTimeMode: RemainingTimeMode
}

export interface DayBalance {
  sollstunden: number
  remainingTimeMode: RemainingTimeMode
  priorOvertime: number
  /** Σ duration of periods that have already ended. */
  closedWorked: number
  /** now − start of the period that is running right now, 0 when nothing runs. */
  liveElapsed: number
  /** closedWorked + liveElapsed — WorkedHours as of `now`. */
  worked: number
  /** WorkedHours assuming the user works to every planned stop. */
  projectedWorked: number
  requiredToday: number
  remaining: number
  /** Remaining at the planned stop, rather than at `now`. */
  projectedRemaining: number
  isPlannedStopMode: boolean
  plannedStopTime: string | null
  countdownHours: number
  liveWindowStart: string | null
  hasPlannedStop: boolean
}

/**
 * Splits WorkedHours at `now` into the part that is settled and the part that
 * is still accruing. Callers used to reconstruct this by subtracting live
 * elapsed back out of a total that already contained it, in two places, with
 * two different formulas.
 */
function splitWorked(
  windows: WorkPeriod[],
  now: string,
  isToday: boolean,
): { closedWorked: number; liveElapsed: number } {
  let closedWorked = 0
  let liveElapsed = 0
  for (const w of windows) {
    if (isToday && (w.end === null || isPlannedStop(w, now))) {
      liveElapsed += elapsedHours(w.start, now, { raceToleranceMinutes: 5 })
    } else if (w.end !== null) {
      closedWorked += elapsedHours(w.start, w.end, { raceToleranceMinutes: 5 })
    }
  }
  return { closedWorked, liveElapsed }
}

/**
 * The day's hours as one value: what is worked, what is projected, what is
 * left, and whether a planned stop is driving the countdown. One derivation
 * for the nav badge, the overtime bar, the tray and the day view.
 */
export function deriveDayBalance(input: DayBalanceInput): DayBalance {
  const { windows, sollstunden, priorOvertime, now, isToday, remainingTimeReference, remainingTimeMode } = input

  const { closedWorked, liveElapsed } = splitWorked(windows, now, isToday)
  const worked = closedWorked + liveElapsed

  const plannedStopPeriod = isToday ? findPlannedStopPeriod(windows, now) : undefined
  const projectedWorked = plannedStopPeriod ? calculateProjectedWorkedHours(windows, now) : worked

  const { isPlannedStopMode, plannedStopTime, countdownHours } = isToday
    ? derivePlannedStopState(windows, now, remainingTimeReference)
    : { isPlannedStopMode: false, plannedStopTime: null, countdownHours: 0 }

  const { remaining, requiredToday } = calculateRemaining({
    sollstunden,
    priorOvertime,
    workedHours: worked,
    projectedWorkedHours: projectedWorked,
    remainingTimeMode,
    isPlannedStopMode,
    countdownHours,
  })

  return {
    sollstunden,
    remainingTimeMode,
    priorOvertime,
    closedWorked,
    liveElapsed,
    worked,
    projectedWorked,
    requiredToday,
    remaining,
    projectedRemaining: sollstunden - priorOvertime - projectedWorked,
    isPlannedStopMode,
    plannedStopTime,
    countdownHours,
    liveWindowStart: findOpenPeriod(windows)?.start ?? null,
    hasPlannedStop: !!plannedStopPeriod,
  }
}

/** A day with no work logged — used where a balance is needed before data arrives. */
export function emptyDayBalance(sollstunden = 0, priorOvertime = 0): DayBalance {
  return deriveDayBalance({
    windows: [],
    sollstunden,
    priorOvertime,
    now: '00:00',
    isToday: true,
    remainingTimeReference: 'planned-stop',
    remainingTimeMode: 'until-zero-overtime',
  })
}

/** Whether any period is running right now — the tick-enable signal for useClock. */
export function hasLiveActivity(windows: WorkPeriod[], now: string): boolean {
  return !!findOpenPeriod(windows) || !!findPlannedStopPeriod(windows, now)
}
