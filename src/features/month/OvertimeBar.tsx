import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import type { DayBalance } from '../../shared/dayBalance'

export interface OfficeStats {
  officeDays: number
  totalWorkDays: number
  officePercent: number
}

interface Props {
  balance: DayBalance
  officeStats?: OfficeStats | null | undefined
  onHide?: (() => void) | undefined
  showTotalWorked?: boolean | undefined
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

interface BarData {
  resultLabel: string
  overtimeLabel: string
  overtimeSign: string
  overtimeClass: string
  summary: string
  resultClass: string
}

function buildBarData(balance: DayBalance, fmt: TimeFormat, showTotalWorked: boolean): BarData {
  const { sollstunden, priorOvertime, closedWorked, liveElapsed, worked, remaining, requiredToday } = balance
  const hasOvertime = priorOvertime >= 0
  const overtimeLabel = hasOvertime ? 'overtime' : 'undertime'
  const overtimeSign = hasOvertime ? '−' : '+'
  const overtimeClass = hasOvertime ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'

  const equationBreakdown =
    balance.remainingTimeMode === 'until-daily-target'
      ? ''
      : ` (${formatHours(sollstunden, fmt)} target ${overtimeSign} ${formatHours(Math.abs(priorOvertime), fmt)} ${overtimeLabel})`

  const workedBreakdownParts: string[] = []
  if (liveElapsed > 0) {
    if (closedWorked > 0) workedBreakdownParts.push(`${formatHours(closedWorked, fmt)} past`)
    workedBreakdownParts.push(`${formatHours(liveElapsed, fmt)} current`)
  }
  const workedBreakdown = workedBreakdownParts.length >= 2 ? ` (${workedBreakdownParts.join(' + ')})` : ''

  const projectedPart = balance.plannedStopTime ? `, projected at ${balance.plannedStopTime}` : ''

  const resultLabel = formatResult(remaining, worked, fmt, showTotalWorked)
  const summary = `${formatHours(requiredToday, fmt)} required${equationBreakdown}, ${formatHours(worked, fmt)} worked${workedBreakdown}${projectedPart} — ${resultLabel}`

  const resultClass = remaining <= 0 ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
  return { resultLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass }
}

function LiveWindowBadge({ elapsed, fmt }: { elapsed: number; fmt: TimeFormat }) {
  return (
    <span className="font-medium text-green-700 dark:text-green-400 tabular-nums" aria-hidden="true">
      {formatHours(elapsed, fmt)} current
    </span>
  )
}

export function OvertimeBar({ balance, officeStats, onHide, showTotalWorked = false }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const { sollstunden, priorOvertime, closedWorked, liveElapsed, worked, requiredToday, plannedStopTime } = balance
  const { resultLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass } = buildBarData(
    balance,
    timeFormat,
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
          {balance.remainingTimeMode !== 'until-daily-target' && (
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
          <span className="font-medium text-gray-700 dark:text-gray-200">{formatHours(worked, timeFormat)} worked</span>
          {liveElapsed > 0 && (
            <>
              <span className="text-gray-400 dark:text-gray-500">(</span>
              {closedWorked > 0 && (
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {formatHours(closedWorked, timeFormat)} past
                </span>
              )}
              {closedWorked > 0 && <span className="text-gray-300 dark:text-gray-600">+</span>}
              <LiveWindowBadge elapsed={liveElapsed} fmt={timeFormat} />
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
              type="button"
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
