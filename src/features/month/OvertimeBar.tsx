import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'

interface Props {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  activeTrackingStartedAt?: string | null
  liveWindowStart?: string | null
  nowHHMM?: string
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
  onHide?: () => void
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

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function elapsedDecimalHours(startedAt: string): number {
  return (Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60)
}

function TrackingBadge({ startedAt }: { startedAt: string }) {
  return (
    <>
      <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
        −
      </span>
      <Link
        to="/"
        search={{ date: startedAt.slice(0, 10) }}
        aria-hidden="true"
        className="font-medium text-green-700 dark:text-green-400 tabular-nums hover:underline"
      >
        {formatElapsed(startedAt)} tracking
      </Link>
    </>
  )
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
  remainingLabel: string
  overtimeLabel: string
  overtimeSign: string
  overtimeClass: string
  summary: string
  resultClass: string
}

function buildBarData(
  sollstunden: number,
  priorOvertime: number,
  workedToday: number,
  trackingElapsed: number,
  liveElapsed: number,
  fmt: TimeFormat,
  activeTrackingStartedAt: string | null | undefined,
  liveWindowStart: string | null | undefined,
): BarData {
  const hasOvertime = priorOvertime >= 0
  const remaining = sollstunden - priorOvertime - workedToday - trackingElapsed - liveElapsed
  const remainingLabel = formatRemaining(remaining, fmt)
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
  const trackingPart = activeTrackingStartedAt ? `, ${formatElapsed(activeTrackingStartedAt)} tracking` : ''
  const currentPart = liveWindowStart ? `, ${formatHours(liveElapsed, fmt)} current` : ''
  const summary = `${formatHours(sollstunden, fmt)} target, ${formatHours(Math.abs(priorOvertime), fmt)} ${overtimeLabel} carry-over, ${formatHours(workedToday, fmt)} worked today${trackingPart}${currentPart} — ${remainingLabel}`
  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
  return { remainingLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass }
}

function LiveWindowBadge({ elapsed, fmt }: { elapsed: number; fmt: TimeFormat }) {
  return (
    <>
      <span aria-hidden="true" className="text-gray-300 dark:text-gray-600">
        −
      </span>
      <span className="font-medium text-green-700 dark:text-green-400 tabular-nums" aria-hidden="true">
        {formatHours(elapsed, fmt)} current
      </span>
    </>
  )
}

export function OvertimeBar({
  sollstunden,
  priorOvertime,
  workedToday,
  activeTrackingStartedAt,
  liveWindowStart,
  nowHHMM: nowHHMMProp,
  officeDays,
  totalWorkDays,
  officePercent,
  onHide,
}: Props) {
  const [, setTick] = useState(0)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const internalNow = useNow(!!liveWindowStart && !nowHHMMProp)
  const nowHHMM = nowHHMMProp ?? internalNow

  useEffect(() => {
    if (!activeTrackingStartedAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTrackingStartedAt])

  const trackingElapsed = activeTrackingStartedAt ? elapsedDecimalHours(activeTrackingStartedAt) : 0
  const liveElapsed = liveWindowStart ? liveWindowElapsedHours(liveWindowStart, nowHHMM) : 0
  const officeStats = getOfficeStats(officeDays, totalWorkDays, officePercent)
  const { remainingLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass } = buildBarData(
    sollstunden,
    priorOvertime,
    workedToday,
    trackingElapsed,
    liveElapsed,
    timeFormat,
    activeTrackingStartedAt,
    liveWindowStart,
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
          <span className="font-medium text-gray-700 dark:text-gray-200">{formatHours(sollstunden, timeFormat)}</span>
          <span>target</span>
          <span className="text-gray-300 dark:text-gray-600">{overtimeSign}</span>
          <span className={`font-medium ${overtimeClass}`}>
            {formatHours(Math.abs(priorOvertime), timeFormat)} {overtimeLabel}
          </span>
          <span className="text-gray-300 dark:text-gray-600">−</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {formatHours(workedToday, timeFormat)} worked
          </span>
          {liveWindowStart && <LiveWindowBadge elapsed={liveElapsed} fmt={timeFormat} />}
          {activeTrackingStartedAt && <TrackingBadge startedAt={activeTrackingStartedAt} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-lg font-bold tabular-nums ${resultClass}`} aria-hidden="true">
            {remainingLabel}
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
