import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useTimeFormatStore, type TimeFormat } from '../stores/timeFormatStore'
import { formatHours } from '../domain/formatHours'

interface Props {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  activeTrackingStartedAt?: string | null
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
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
        to="/day"
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

export function OvertimeBar({
  sollstunden,
  priorOvertime,
  workedToday,
  activeTrackingStartedAt,
  officeDays,
  totalWorkDays,
  officePercent,
}: Props) {
  const [, setTick] = useState(0)
  const timeFormat = useTimeFormatStore((s) => s.format)

  useEffect(() => {
    if (!activeTrackingStartedAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTrackingStartedAt])

  const trackingElapsed = activeTrackingStartedAt ? elapsedDecimalHours(activeTrackingStartedAt) : 0
  const hasOvertime = priorOvertime >= 0
  const remaining = sollstunden - priorOvertime - workedToday - trackingElapsed
  const remainingLabel = formatRemaining(remaining, timeFormat)
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
  const trackingPart = activeTrackingStartedAt ? `, ${formatElapsed(activeTrackingStartedAt)} tracking` : ''
  const officeStats = getOfficeStats(officeDays, totalWorkDays, officePercent)
  const summary = `${sollstunden}h target, ${formatHours(Math.abs(priorOvertime), timeFormat)} ${overtimeLabel} carry-over, ${formatHours(workedToday, timeFormat)} worked today${trackingPart} — ${remainingLabel}`
  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'

  return (
    <div
      role="status"
      aria-label={summary}
      className="rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-6" aria-hidden="true">
        {/* Left: inputs summary */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">{sollstunden}h</span>
            <span>target</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className={`font-medium tabular-nums ${overtimeClass}`}>
              {overtimeSign}
              {formatHours(Math.abs(priorOvertime), timeFormat)}
            </span>
            <span>carry-over</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">
              {formatHours(workedToday, timeFormat)}
            </span>
            <span>logged today</span>
            {activeTrackingStartedAt && <TrackingBadge startedAt={activeTrackingStartedAt} />}
          </div>
          {officeStats && (
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              <span aria-hidden="true">🏢</span>
              <span>{officeStats.officePercent}% office</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span>
                {officeStats.officeDays}/{officeStats.totalWorkDays} days
              </span>
            </div>
          )}
        </div>

        {/* Right: result */}
        <div className="shrink-0 text-right">
          <span className={`text-xl font-bold tabular-nums ${resultClass}`}>{remainingLabel}</span>
        </div>
      </div>
    </div>
  )
}
