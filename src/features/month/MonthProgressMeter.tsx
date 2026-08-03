import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { OfficeStats } from '../../shared/officeStats'
import { balanceInk, formatSignedHours } from './monthBalanceFormat'
import type { MonthOverview } from './monthOverview'

interface Props {
  overview: MonthOverview
  /** Whether the cumulative over/undertime is shown — the `showOvertimeBar` setting. */
  showBalance: boolean
  officeStats: OfficeStats | null
  onHideBalance: () => void
}

export function MonthProgressMeter({ overview, showBalance, officeStats, onHideBalance }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  return (
    <section className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Worked this month</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatHours(overview.worked, timeFormat)}
            <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              of {formatHours(overview.targetFullMonth, timeFormat)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showBalance && (
            <span className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs dark:border-gray-600">
              <span className="text-gray-500 dark:text-gray-400">Balance</span>
              <span className={`font-semibold tabular-nums ${balanceInk(overview.cumulativeBalance)}`}>
                {formatSignedHours(overview.cumulativeBalance, timeFormat)}
              </span>
              <button
                type="button"
                onClick={onHideBalance}
                aria-label="Hide balance"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </span>
          )}

          {overview.untrackedCount > 0 && (
            <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <span className="font-semibold">
                {overview.untrackedCount} day{overview.untrackedCount === 1 ? '' : 's'} untracked
              </span>
              <span className="ml-1.5 tabular-nums">{formatHours(overview.missingHours, timeFormat)} missing</span>
            </span>
          )}

          {overview.needsReviewCount > 0 && (
            <span className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {overview.needsReviewCount} day{overview.needsReviewCount === 1 ? '' : 's'} to review
            </span>
          )}

          {officeStats && (
            <span className="rounded-lg border px-2.5 py-1 text-xs dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Office </span>
              <span className="font-semibold tabular-nums">{officeStats.officePercent}%</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                ({officeStats.officeDays}/{officeStats.totalWorkDays})
              </span>
            </span>
          )}
        </div>
      </div>

      {/* One axis: share of the full-month target. The notch marks the part already due. */}
      <div
        role="meter"
        aria-label="Worked hours this month"
        aria-valuemin={0}
        aria-valuemax={overview.targetFullMonth}
        aria-valuenow={overview.worked}
        className="relative mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700"
      >
        <div
          className="h-2 rounded-full bg-indigo-500"
          style={{ width: `${Math.min(100, overview.workedPercent)}%` }}
          aria-hidden="true"
        />
        <div
          title="Target up to today"
          className="absolute top-[-3px] h-3.5 w-0.5 bg-gray-900 dark:bg-gray-100"
          style={{ left: `${Math.min(100, overview.targetToDatePercent)}%` }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
