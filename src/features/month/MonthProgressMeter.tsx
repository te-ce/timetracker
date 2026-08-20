import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { OfficeStats } from '../../shared/officeStats'
import type { DayBalance } from '../../shared/dayBalance'
import { buildBarData, deriveLoadingState } from './overtimeBarData'
import { Skeleton } from './Skeleton'
import type { MonthOverview } from './monthOverview'
import { NeedsReviewBadge } from './badges/NeedsReviewBadge'
import { OfficeBadge } from './badges/OfficeBadge'
import { OvertimeBadge } from './badges/OvertimeBadge'
import { ResultBadge } from './badges/ResultBadge'
import { UntrackedBadge } from './badges/UntrackedBadge'

interface Props {
  overview: MonthOverview
  officeStats: OfficeStats | null
  /** Today's balance, shown alongside the month total — the day-level half of the merged bar. */
  todayBalance: DayBalance
  isTodayLoading?: boolean | undefined
}

export function MonthProgressMeter({ overview, officeStats, todayBalance, isTodayLoading = false }: Props) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const { requiredToday, worked: workedToday, priorOvertime, plannedStopTime } = todayBalance
  const { resultLabel, summary } = buildBarData(todayBalance, timeFormat, false)
  const monthSummary = `${formatHours(overview.worked, timeFormat)} of ${formatHours(overview.targetFullMonth, timeFormat)} worked this month`
  const { overtimeUnknown, resultUnknown, ariaLabel } = deriveLoadingState(
    todayBalance,
    isTodayLoading,
    false,
    `${monthSummary}. Today: ${summary}`,
  )
  const isTodayOver = todayBalance.remaining <= 0

  return (
    <section
      role="status"
      aria-label={ariaLabel}
      className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Worked this month</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatHours(overview.worked, timeFormat)}
              <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                of {formatHours(overview.targetFullMonth, timeFormat)}
              </span>
            </p>
          </div>

          <div className="border-l pl-6 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatHours(workedToday, timeFormat)}
              <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                of {overtimeUnknown ? <Skeleton className="w-10" /> : formatHours(requiredToday, timeFormat)}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OvertimeBadge overtimeUnknown={overtimeUnknown} priorOvertime={priorOvertime} timeFormat={timeFormat} />

          <ResultBadge
            overtimeUnknown={overtimeUnknown}
            resultUnknown={resultUnknown}
            isTodayOver={isTodayOver}
            resultLabel={resultLabel}
          />

          {plannedStopTime && (
            <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              projected {plannedStopTime}
            </span>
          )}

          <UntrackedBadge overview={overview} timeFormat={timeFormat} />
          <NeedsReviewBadge needsReviewCount={overview.needsReviewCount} />
          <OfficeBadge officeStats={officeStats} />
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
