import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import type { DayBalance } from '../../shared/dayBalance'

import { LiveWindowBadge } from './LiveWindowBadge'
import { buildBarData, deriveLoadingState, type OfficeStats } from './overtimeBarData'
import { RequiredBadge } from './RequiredBadge'
import { Skeleton } from './Skeleton'

interface Props {
  balance: DayBalance
  officeStats?: OfficeStats | null | undefined
  onHide?: (() => void) | undefined
  showTotalWorked?: boolean | undefined
  /** True while the prior-months overtime carry-over is still loading — skeletons the numbers derived from it instead of showing a value seeded from a not-yet-resolved carry-over. */
  isLoading?: boolean | undefined
}

export function OvertimeBar({ balance, officeStats, onHide, showTotalWorked = false, isLoading = false }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const { closedWorked, liveElapsed, worked, plannedStopTime } = balance
  const { resultLabel, overtimeLabel, overtimeSign, overtimeClass, summary, resultClass } = buildBarData(
    balance,
    timeFormat,
    showTotalWorked,
  )
  const { overtimeUnknown, resultUnknown, ariaLabel } = deriveLoadingState(balance, isLoading, showTotalWorked, summary)

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        >
          <RequiredBadge
            balance={balance}
            overtimeUnknown={overtimeUnknown}
            overtimeSign={overtimeSign}
            overtimeLabel={overtimeLabel}
            overtimeClass={overtimeClass}
            fmt={timeFormat}
          />
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
            {resultUnknown ? <Skeleton className="w-16 h-5" /> : resultLabel}
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
