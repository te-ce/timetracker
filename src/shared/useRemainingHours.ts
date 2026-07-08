import { useState, useEffect } from 'react'
import { useTodayIso } from './useTodayIso'
import { useDayQuery } from '../features/day/useDayQuery'
import { formatHours } from './formatHours'
import {
  findOpenPeriod,
  findPlannedStopPeriod,
  derivePlannedStopState,
  calculateProjectedWorkedHours,
} from './worktime'
import { calculateRemaining } from './remainingCalc'
import { useTimeFormatStore } from './timeFormatStore'
export { buildReceipt } from './remainingCalc'
export type { ReceiptLine } from './remainingCalc'

function nowHHMMFn(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function minutesFrom(t: string): number {
  const parts = t.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

function liveWindowElapsedHours(start: string, now: string): number {
  let startMins = minutesFrom(start)
  let nowMins = minutesFrom(now)
  if (nowMins < startMins) nowMins += 24 * 60
  return (nowMins - startMins) / 60
}

function buildSummary(sollstunden: number, priorOvertime: number, workedHours: number): string {
  const hasOvertime = priorOvertime >= 0
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const remaining = sollstunden - priorOvertime - workedHours
  let remainingLabel: string
  if (remaining > 0) remainingLabel = `${formatHours(remaining, 'decimal')} remaining`
  else if (remaining === 0) remainingLabel = 'Done'
  else remainingLabel = `${formatHours(Math.abs(remaining), 'decimal')} overtime today`
  return `${formatHours(sollstunden, 'decimal')} target, ${formatHours(Math.abs(priorOvertime), 'decimal')} ${overtimeLabel} carry-over, ${formatHours(workedHours, 'decimal')} worked today — ${remainingLabel}`
}

export function useRemainingHours() {
  const todayIso = useTodayIso()
  const { config, sollstunden, workedHours, overtimeToDate, windows, officeDays, totalWorkDays, officePercent } =
    useDayQuery(todayIso)
  const liveWindowStart = findOpenPeriod(windows)?.start ?? null

  const [currentNow, setCurrentNow] = useState(nowHHMMFn)

  // Use a fresh real-time value for detection so a just-closed period (whose
  // `end` equals the current minute) is not mistaken for a planned-stop period
  // due to a stale `currentNow` tick that hasn't fired yet.
  const plannedStopPeriod = findPlannedStopPeriod(windows, nowHHMMFn())
  const hasLiveActivity = !!liveWindowStart || !!plannedStopPeriod

  useEffect(() => {
    if (!hasLiveActivity) return
    setCurrentNow(nowHHMMFn())
    const id = setInterval(() => setCurrentNow(nowHHMMFn()), 60_000)
    return () => clearInterval(id)
  }, [hasLiveActivity])

  const liveElapsed = liveWindowStart ? liveWindowElapsedHours(liveWindowStart, currentNow) : 0
  const plannedLiveElapsed = plannedStopPeriod ? liveWindowElapsedHours(plannedStopPeriod.start, currentNow) : 0

  // workedHours from useDayQuery now includes live elapsed for open/planned-stop periods
  // (buildDaySummary passes `now` to calculateWorkedHours). Subtract to get closed-only
  // hours so callers that do (workedHours + liveElapsed) still get the correct total.
  const closedWorkedHours = Math.max(0, workedHours - liveElapsed - plannedLiveElapsed)

  // Full projected worked hours, including the still-to-come portion of a planned-stop
  // period. Only meaningful (and only computed) when a planned stop actually exists.
  const projectedWorkedHours = plannedStopPeriod ? calculateProjectedWorkedHours(windows, currentNow) : undefined
  const projectedRemaining = sollstunden - overtimeToDate.priorOvertime - (projectedWorkedHours ?? workedHours)

  const remainingTimeReference = config?.remainingTimeReference ?? 'planned-stop'
  const remainingTimeMode = config?.remainingTimeMode ?? 'until-zero-overtime'
  const { isPlannedStopMode, plannedStopTime, countdownHours } = derivePlannedStopState(
    windows,
    currentNow,
    remainingTimeReference,
  )

  // workedHours already contains live elapsed, so just subtract once. When the countdown
  // is off (isPlannedStopMode false) but a planned stop still exists, project the future
  // portion so remaining/overtime already reflects the scheduled stop.
  const { remaining } = calculateRemaining({
    sollstunden,
    priorOvertime: overtimeToDate.priorOvertime,
    workedHours,
    projectedWorkedHours,
    remainingTimeMode,
    isPlannedStopMode,
    countdownHours,
  })

  const { format } = useTimeFormatStore()
  const priorOvertime = overtimeToDate.priorOvertime
  const summary = buildSummary(sollstunden, priorOvertime, workedHours)

  useEffect(() => {
    const label = remaining > 0 ? `(${formatHours(remaining, format)} left) ` : ''
    document.title = `${label}Timetracker`
  }, [remaining, format])

  return {
    remaining,
    projectedRemaining,
    isPlannedStopMode,
    plannedStopTime,
    sollstunden,
    workedHours: closedWorkedHours,
    priorOvertime,
    liveElapsed,
    summary,
    officeDays,
    totalWorkDays,
    officePercent,
  }
}
