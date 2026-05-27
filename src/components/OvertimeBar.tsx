import { useState, useEffect } from 'react'

interface Props {
  sollstunden: number
  priorOvertime: number
  workedToday: number
  activeTrackingStartedAt?: string | null
  officeDays?: number
  totalWorkDays?: number
  officePercent?: number
}

function formatRemaining(remaining: number): string {
  if (remaining > 0) return `${remaining.toFixed(2)}h remaining`
  if (remaining === 0) return 'Done'
  return `${Math.abs(remaining).toFixed(2)}h overtime today`
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

  useEffect(() => {
    if (!activeTrackingStartedAt) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [activeTrackingStartedAt])

  const trackingElapsed = activeTrackingStartedAt ? elapsedDecimalHours(activeTrackingStartedAt) : 0
  const hasOvertime = priorOvertime >= 0
  const remaining = sollstunden - priorOvertime - workedToday - trackingElapsed
  const showOffice = officeDays !== undefined && totalWorkDays !== undefined && officePercent !== undefined

  const remainingLabel = formatRemaining(remaining)

  const trackingPart = activeTrackingStartedAt
    ? `, ${formatElapsed(activeTrackingStartedAt)} tracking`
    : ''
  const summary = `${sollstunden}h target, ${Math.abs(priorOvertime).toFixed(2)}h ${hasOvertime ? 'overtime' : 'undertime'} carry-over, ${workedToday.toFixed(2)}h worked today${trackingPart} — ${remainingLabel}`

  return (
    <div
      role="status"
      aria-label={summary}
      className="flex items-center gap-1.5 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-4 py-2 text-sm"
    >
      <span aria-hidden="true" className="font-medium">
        {sollstunden}h
      </span>
      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
        {hasOvertime ? '−' : '+'}
      </span>
      <span aria-hidden="true" className={`font-medium ${hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
        {Math.abs(priorOvertime).toFixed(2)}h {hasOvertime ? 'overtime' : 'undertime'}
      </span>
      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
        −
      </span>
      <span aria-hidden="true" className="font-medium">
        {workedToday.toFixed(2)}h worked
      </span>
      {activeTrackingStartedAt && (
        <>
          <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
            −
          </span>
          <span aria-hidden="true" className="font-medium text-green-700 dark:text-green-400 tabular-nums">
            {formatElapsed(activeTrackingStartedAt)} tracking
          </span>
        </>
      )}
      <span aria-hidden="true" className="text-gray-400 dark:text-gray-500">
        =
      </span>
      <span aria-hidden="true" className={`font-semibold ${remaining <= 0 ? 'text-green-700 dark:text-green-400' : ''}`}>
        {remainingLabel}
      </span>
      {showOffice && (
        <span aria-hidden="true" className="ml-2 text-gray-400 dark:text-gray-500 font-light">
          (<span aria-hidden="true">🏢</span> {officePercent}% · {officeDays}/{totalWorkDays} days)
        </span>
      )}
    </div>
  )
}
