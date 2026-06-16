import { useState, useEffect } from 'react'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'

interface Props {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  liveWindowStart?: string | null
  nowHHMM?: string
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
  plannedStopTime?: string | null
  onHide?: () => void
  remainingTimeMode?: 'until-zero-overtime' | 'until-daily-target'
  showTotalWorked?: boolean
}

function nowHHMMFn() {
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

function useNow(enabled: boolean): string {
  const [now, setNow] = useState(nowHHMMFn)
  useEffect(() => {
    if (!enabled) return
    setNow(nowHHMMFn())
    const id = setInterval(() => setNow(nowHHMMFn()), 60_000)
    return () => clearInterval(id)
  }, [enabled])
  return now
}

function formatRemaining(remaining: number, fmt: TimeFormat): string {
  if (remaining > 0) return `${formatHours(remaining, fmt)} remaining`
  if (remaining === 0) return 'Done'
  return `${formatHours(Math.abs(remaining), fmt)} overtime today`
}

function formatResult(remaining: number, totalWorked: number, fmt: TimeFormat, showTotalWorked: boolean): string {
  if (showTotalWorked) return `${formatHours(totalWorked, fmt)} worked today`
  return formatRemaining(remaining, fmt)
}

interface OfficeStats {
  officeDays: number
  totalWorkDays: number
  officePercent: number
}

function getOfficeStats(officeDays?: number, totalWorkDays?: number, officePercent?: number): OfficeStats | null {
  if (officeDays === undefined || totalWorkDays === undefined || officePercent === undefined) return null
  return { officeDays, totalWorkDays, officePercent }
}

interface BarData {
  resultLabel: string
  overtimeLabel: string
  overtimeSign: string
  overtimeClass: string
  summary: string
  resultClass: string
  requiredToday: number
  totalWorked: number
  pastWorkedToday: number
}

function buildBarData(
  sollstunden: number,
  priorOvertime: number,
  workedToday: number,
  liveElapsed: number,
  fmt: TimeFormat,
  plannedStopTime: string | null | undefined,
  remainingTimeMode: 'until-zero-overtime' | 'until-daily-target' | undefined,
  showTotalWorked: boolean,
): BarData {
  // workedToday already includes live elapsed (buildDaySummary passes `now`). Subtract
  // it back to get the closed-only portion for the "past" breakdown label.
  const pastWorkedToday = Math.max(0, workedToday - liveElapsed)
  const hasOvertime = priorOvertime >= 0
  const remaining =
    remainingTimeMode === 'until-daily-target' ? sollstunden - workedToday : sollstunden - priorOvertime - workedToday
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'

  const requiredToday = remainingTimeMode === 'until-daily-target' ? sollstunden : sollstunden - priorOvertime
  const totalWorked = pastWorkedToday + liveElapsed

  const equationBreakdown =
    remainingTimeMode === 'until-daily-target'
      ? ''
      : ` (${formatHours(sollstunden, fmt)} target ${overtimeSign} ${formatHours(Math.abs(priorOvertime), fmt)} ${overtimeLabel})`

  const workedBreakdownParts: string[] = []
  if (liveElapsed > 0) {
    if (pastWorkedToday > 0) workedBreakdownParts.push(`${formatHours(pastWorkedToday, fmt)} past`)
    workedBreakdownParts.push(`${formatHours(liveElapsed, fmt)} current`)
  }
  const workedBreakdown = workedBreakdownParts.length >= 2 ? ` (${workedBreakdownParts.join(' + ')})` : ''

  const projectedPart = plannedStopTime ? `, projected at ${plannedStopTime}` : ''

  const resultLabel = formatResult(remaining, totalWorked, fmt, showTotalWorked)
  const summary = `${formatHours(requiredToday, fmt)} required${equationBreakdown}, ${formatHours(totalWorked, fmt)} worked${workedBreakdown}${projectedPart} — ${resultLabel}`

  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
  return {
    resultLabel,
    overtimeLabel,
    overtimeSign,
    overtimeClass,
    summary,
    resultClass,
    requiredToday,
    totalWorked,
    pastWorkedToday,
  }
}

function LiveWindowBadge({ elapsed, fmt }: { elapsed: number; fmt: TimeFormat }) {
  return (
    <span className="font-medium text-green-700 dark:text-green-400 tabular-nums" aria-hidden="true">
      {formatHours(elapsed, fmt)} current
    </span>
  )
}

export function OvertimeBar({
  sollstunden,
  priorOvertime,
  workedToday,
  liveWindowStart,
  nowHHMM: nowHHMMProp,
  officeDays,
  totalWorkDays,
  officePercent,
  plannedStopTime,
  onHide,
  remainingTimeMode,
  showTotalWorked = false,
}: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const internalNow = useNow(!!liveWindowStart && !nowHHMMProp)
  const nowHHMM = nowHHMMProp ?? internalNow

  const liveElapsed = liveWindowStart ? liveWindowElapsedHours(liveWindowStart, nowHHMM) : 0
  const officeStats = getOfficeStats(officeDays, totalWorkDays, officePercent)
  const {
    resultLabel,
    overtimeLabel,
    overtimeSign,
    overtimeClass,
    summary,
    resultClass,
    requiredToday,
    totalWorked,
    pastWorkedToday,
  } = buildBarData(
    sollstunden,
    priorOvertime,
    workedToday,
    liveElapsed,
    timeFormat,
    plannedStopTime,
    remainingTimeMode,
    showTotalWorked,
  )

  return (
    <div
      role="status"
      aria-label={summary}
      className="rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        >
          {/* Required: X required (target ± overtime) */}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatHours(requiredToday, timeFormat)} required
          </span>
          {remainingTimeMode !== 'until-daily-target' && (
            <>
              <span className="text-gray-400 dark:text-gray-500">(</span>
              <span className="font-medium text-gray-500 dark:text-gray-400">
                {formatHours(sollstunden, timeFormat)}
              </span>
              <span>target</span>
              <span className="text-gray-300 dark:text-gray-600">{overtimeSign}</span>
              <span className={`font-medium ${overtimeClass}`}>
                {formatHours(Math.abs(priorOvertime), timeFormat)} {overtimeLabel}
              </span>
              <span className="text-gray-400 dark:text-gray-500">)</span>
            </>
          )}
          {/* − separator */}
          <span className="text-gray-300 dark:text-gray-600">−</span>
          {/* Worked: totalWorked worked (past + current) */}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatHours(totalWorked, timeFormat)} worked
          </span>
          {liveWindowStart && (
            <>
              <span className="text-gray-400 dark:text-gray-500">(</span>
              {pastWorkedToday > 0 && (
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {formatHours(pastWorkedToday, timeFormat)} past
                </span>
              )}
              {liveWindowStart && (
                <>
                  {pastWorkedToday > 0 && <span className="text-gray-300 dark:text-gray-600">+</span>}
                  <LiveWindowBadge elapsed={liveElapsed} fmt={timeFormat} />
                </>
              )}
              <span className="text-gray-400 dark:text-gray-500">)</span>
            </>
          )}
          {/* = result */}
          <span className="text-gray-300 dark:text-gray-600">=</span>
          {plannedStopTime && (
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              projected at {plannedStopTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-lg font-bold tabular-nums ${resultClass}`} aria-hidden="true">
            {resultLabel}
          </span>
          {onHide && (
            <button
              onClick={onHide}
              aria-label="Hide overtime bar"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 leading-none p-1 rounded"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {officeStats && (
        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <span aria-hidden="true">🏢</span>
          <span>{officeStats.officePercent}% office</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span>
            {officeStats.officeDays}/{officeStats.totalWorkDays} days
          </span>
        </div>
      )}
    </div>
  )
}
