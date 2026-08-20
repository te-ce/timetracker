import { formatHours } from '../../shared/formatHours'
import { type TimeFormat } from '../../shared/timeFormatStore'
import { deriveLoadingState } from '../month/overtimeBarData'
import { Skeleton } from '../month/Skeleton'
import type { DayBalance } from '../../shared/dayBalance'
import { balanceInk, formatSignedHours } from '../month/monthBalanceFormat'

/** Target ± overtime = required; required − worked = remaining. Folds the OvertimeBar's numbers into the totals panel. */
export interface BalanceRowsProps {
  balance: DayBalance
  isLoading: boolean
  timeFormat: TimeFormat
}

/** Target ± overtime = required; required − worked = remaining. Folds the OvertimeBar's numbers into the totals panel. */

/** Target ± overtime = required; required − worked = remaining. Folds the OvertimeBar's numbers into the totals panel. */
export function BalanceRows({ balance, isLoading, timeFormat }: BalanceRowsProps) {
  const { sollstunden, requiredToday, priorOvertime, remaining, plannedStopTime, etaTime } = balance
  const summary = `${formatHours(sollstunden, timeFormat)} target, ${formatSignedHours(priorOvertime, timeFormat)} overtime, ${formatHours(requiredToday, timeFormat)} required, ${formatHours(remaining, timeFormat)} remaining${etaTime ? `, done at ${etaTime}` : ''}`
  const { overtimeUnknown, resultUnknown, ariaLabel } = deriveLoadingState(balance, isLoading, false, summary)

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className="mt-2 flex flex-col gap-0.5 border-t pt-2 text-xs dark:border-gray-700"
    >
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">Target</span>
        <span className="font-mono tabular-nums" aria-hidden="true">
          {formatHours(sollstunden, timeFormat)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">Overtime</span>
        {overtimeUnknown ? (
          <Skeleton className="w-10" />
        ) : (
          <span className={`font-mono tabular-nums ${balanceInk(priorOvertime)}`} aria-hidden="true">
            {formatSignedHours(priorOvertime, timeFormat)}
          </span>
        )}
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">Required</span>
        <span className="font-mono tabular-nums" aria-hidden="true">
          {overtimeUnknown ? <Skeleton className="w-10" /> : formatHours(requiredToday, timeFormat)}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">Remaining</span>
        <span
          className={`font-mono font-semibold tabular-nums ${remaining <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'}`}
          aria-hidden="true"
        >
          {resultUnknown ? <Skeleton className="w-14" /> : formatHours(remaining, timeFormat)}
        </span>
      </div>
      {etaTime && !resultUnknown && (
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Done at</span>
          <span className="font-mono tabular-nums" aria-hidden="true">
            {etaTime}
          </span>
        </div>
      )}
      {plannedStopTime && (
        <div className="mt-0.5 rounded-md bg-blue-100 px-1.5 py-0.5 text-center text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
          projected at {plannedStopTime}
        </div>
      )}
    </div>
  )
}
