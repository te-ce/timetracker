import { useEffect } from 'react'
import { useTodayIso } from './useTodayIso'
import { useDayQuery } from '../features/day/useDayQuery'
import { formatHours } from './formatHours'
import { nowHHMM } from './worktime'
import { deriveDayBalance, hasLiveActivity } from './dayBalance'
import { useClock } from './useClock'
import { useTimeFormatStore } from './timeFormatStore'
export { buildReceipt } from './remainingCalc'

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
  const { config, sollstunden, overtimeToDate, windows, officeDays, totalWorkDays, officePercent, isOvertimeReady } =
    useDayQuery(todayIso)

  // Detection uses a fresh read rather than the ticked value so a just-closed
  // period (whose `end` equals the current minute) isn't mistaken for a
  // planned stop by a tick that hasn't fired yet.
  const currentNow = useClock(hasLiveActivity(windows, nowHHMM()))

  const balance = deriveDayBalance({
    windows,
    sollstunden,
    priorOvertime: overtimeToDate.priorOvertime,
    now: currentNow,
    isToday: true,
    remainingTimeReference: config.remainingTimeReference,
    remainingTimeMode: config.remainingTimeMode,
  })

  const { format } = useTimeFormatStore()
  const summary = buildSummary(balance.sollstunden, balance.priorOvertime, balance.worked)

  useEffect(() => {
    const label = balance.remaining > 0 ? `(${formatHours(balance.remaining, format)} left) ` : ''
    document.title = `${label}Timetracker`
  }, [balance.remaining, format])

  return {
    balance,
    remaining: balance.remaining,
    projectedRemaining: balance.projectedRemaining,
    isPlannedStopMode: balance.isPlannedStopMode,
    plannedStopTime: balance.plannedStopTime,
    sollstunden: balance.sollstunden,
    workedHours: balance.closedWorked,
    priorOvertime: balance.priorOvertime,
    liveElapsed: balance.liveElapsed,
    summary,
    officeDays,
    totalWorkDays,
    officePercent,
    isOvertimeReady,
  }
}
