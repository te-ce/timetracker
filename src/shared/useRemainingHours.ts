import { useState, useEffect } from 'react'
import { toLocalIso } from './dateUtils'
import { useDayQuery } from '../features/day/useDayQuery'
import { formatHours } from './formatHours'
import { useActiveTracking } from './useActiveTracking'
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

function elapsedDecimalHours(startedAt: string): number {
  return (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
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
}

export function buildReceipt(
  sollstunden: number,
  priorOvertime: number,
  workedHours: number,
  trackingElapsed: number,
  liveElapsed: number,
  fmt: TimeFormat,
): ReceiptLine[] {
  const remaining = sollstunden - priorOvertime - workedHours - trackingElapsed - liveElapsed
  const hasOvertime = priorOvertime >= 0
  const carrySign = hasOvertime ? '-' : '+'
  const carryLabel = hasOvertime ? 'Overtime carry-over' : 'Undertime carry-over'

  const lines: ReceiptLine[] = [
    { label: 'Target', value: formatHours(sollstunden, fmt) },
    { label: carryLabel, value: `${carrySign}${formatHours(Math.abs(priorOvertime), fmt)}` },
    { label: 'Worked today', value: `-${formatHours(workedHours, fmt)}` },
  ]

  if (trackingElapsed > 0) {
    lines.push({ label: 'Tracking', value: `-${formatHours(trackingElapsed, fmt)}` })
  }
  if (liveElapsed > 0) {
    lines.push({ label: 'Current tracking', value: `-${formatHours(liveElapsed, fmt)}` })
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
  const todayIso = toLocalIso(new Date())
  const { config, sollstunden, workedHours, overtimeToDate, windows, officeDays, totalWorkDays, officePercent } =
    useDayQuery(todayIso)
  const activeTracking = useActiveTracking()
  const activeTrackingStartedAt = activeTracking?.startedAt ?? null
  const liveWindowStart = findOpenPeriod(windows)?.start ?? null

  const [, setTick] = useState(0)
  const [currentNow, setCurrentNow] = useState(nowHHMMFn)

  useEffect(() => {
    if (!activeTrackingStartedAt) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [activeTrackingStartedAt])

  const plannedStopPeriod = findPlannedStopPeriod(windows, currentNow)
  const hasLiveActivity = !!liveWindowStart || !!plannedStopPeriod

  useEffect(() => {
    if (!hasLiveActivity) return
    const id = setInterval(() => setCurrentNow(nowHHMMFn()), 60_000)
    return () => clearInterval(id)
  }, [hasLiveActivity])

  const trackingElapsed = activeTrackingStartedAt ? elapsedDecimalHours(activeTrackingStartedAt) : 0
  const liveElapsed = liveWindowStart ? liveWindowElapsedHours(liveWindowStart, currentNow) : 0

  // For a Planned-Stop WorkPeriod: the query's workedHours includes its full planned
  // duration (end − start). Correct it back to live elapsed for target-hours calculations.
  const plannedFullDuration = plannedStopPeriod
    ? liveWindowElapsedHours(plannedStopPeriod.start, plannedStopPeriod.end!)
    : 0
  const plannedLiveElapsed = plannedStopPeriod ? liveWindowElapsedHours(plannedStopPeriod.start, currentNow) : 0
  const correctedWorkedHours = workedHours - plannedFullDuration

  // Projected remaining: uses full planned duration (workedHours already includes it).
  const projectedRemaining = sollstunden - overtimeToDate.priorOvertime - workedHours - trackingElapsed

  const remainingTimeReference = config?.remainingTimeReference ?? 'planned-stop'
  const isPlannedStopMode = !!plannedStopPeriod && remainingTimeReference !== 'target-hours'
  const plannedStopTime = plannedStopPeriod?.end ?? null

  const countdownHours = plannedStopPeriod ? liveWindowElapsedHours(currentNow, plannedStopPeriod.end!) : 0

  const remaining = isPlannedStopMode
    ? countdownHours
    : sollstunden -
      overtimeToDate.priorOvertime -
      correctedWorkedHours -
      trackingElapsed -
      plannedLiveElapsed -
      liveElapsed

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
    workedHours,
    priorOvertime,
    trackingElapsed,
    liveElapsed,
    summary,
    officeDays,
    totalWorkDays,
    officePercent,
  }
}
