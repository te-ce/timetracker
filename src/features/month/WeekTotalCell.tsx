import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { balanceInk, formatSignedHours } from './monthBalanceFormat'
import type { MonthOverviewWeek } from './monthOverview'

export function WeekTotalCell({ week, timeFormat }: { week: MonthOverviewWeek; timeFormat: TimeFormat }) {
  return (
    <div className="flex flex-col justify-center rounded-lg border border-dashed px-2 py-1.5 text-right dark:border-gray-700">
      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">KW {week.isoWeek}</p>
      {!week.isFuture && (
        <>
          <p className="text-sm font-semibold tabular-nums">{formatHours(week.worked, timeFormat)}</p>
          {week.overtimeToDate !== null && (
            <p className={`text-xs tabular-nums ${balanceInk(week.overtimeToDate)}`}>
              {formatSignedHours(week.overtimeToDate, timeFormat)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
