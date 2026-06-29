import { useState, useEffect } from 'react'
import { useTodayIso } from './useTodayIso'
import { useDayQuery } from '../features/day/useDayQuery'
import { formatHours } from './formatHours'
import { findOpenPeriod, findPlannedStopPeriod } from './worktime'
import type { TimeFormat } from './timeFormatStore'
import { useTimeFormatStore } from './timeFormatStore'

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

export interface ReceiptLine {
  label: string
  value: string
  isTotal?: boolean
  isSubItem?: boolean
}

export function buildReceipt(
  sollstunden: number,
  priorOvertime: number,
  workedHours: number,
  liveElapsed: number,
  fmt: TimeFormat,
): ReceiptLine[] {
  const requiredToday = sollstunden - priorOvertime
  const totalWorked = workedHours + liveElapsed
  const remaining = requiredToday - totalWorked
  const hasOvertime = priorOvertime >= 0
  const carrySign = hasOvertime ? '-' : '+'
  const carryLabel = hasOvertime ? 'Overtime carry-over' : 'Undertime carry-over'

  const lines: ReceiptLine[] = [
    { label: 'Required', value: formatHours(requiredToday, fmt) },
    { label: 'Target', value: formatHours(sollstunden, fmt), isSubItem: true },
    { label: carryLabel, value: `${carrySign}${formatHours(Math.abs(priorOvertime), fmt)}`, isSubItem: true },
    { label: 'Worked', value: `-${formatHours(totalWorked, fmt)}` },
    { label: 'Past', value: formatHours(workedHours, fmt), isSubItem: true },
  ]

  if (liveElapsed > 0) {
    lines.push({ label: 'Current', value: formatHours(liveElapsed, fmt), isSubItem: true })
  }

  if (remaining > 0) {
    lines.push({ label: 'Remaining', value: formatHours(remaining, fmt), isTotal: true })
  } else if (remaining === 0) {
    lines.push({ label: 'Done', value: '', isTotal: true })
  } else {
    lines.push({ label: 'Overtime', value: formatHours(Math.abs(remaining), fmt), isTotal: true })
  }

  return lines
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

  // Projected remaining: uses the full query workedHours (which after 8cd2ee1 equals
  // closed + planned-live, not closed + full-planned-duration — known limitation).
  const projectedRemaining = sollstunden - overtimeToDate.priorOvertime - workedHours

  const remainingTimeReference = config?.remainingTimeReference ?? 'planned-stop'
  const remainingTimeMode = config?.remainingTimeMode ?? 'until-zero-overtime'
  const isPlannedStopMode = !!plannedStopPeriod && remainingTimeReference !== 'target-hours'
  const plannedStopTime = plannedStopPeriod?.end ?? null

  const countdownHours = plannedStopPeriod ? liveWindowElapsedHours(currentNow, plannedStopPeriod.end!) : 0

  // workedHours already contains live elapsed, so just subtract once.
  const remaining = isPlannedStopMode
    ? countdownHours
    : remainingTimeMode === 'until-daily-target'
      ? sollstunden - workedHours
      : sollstunden - overtimeToDate.priorOvertime - workedHours

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
