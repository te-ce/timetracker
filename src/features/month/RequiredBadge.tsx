import type { DayBalance } from '../../shared/dayBalance'
import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { Skeleton } from './Skeleton'

export interface RequiredBadgeProps {
  balance: DayBalance
  overtimeUnknown: boolean
  overtimeSign: string
  overtimeLabel: string
  overtimeClass: string
  fmt: TimeFormat
}

/** "X required (target ± overtime)" — the parenthetical (and, while loading, the required figure itself) depends on the still-loading prior-months carry-over. */
export function RequiredBadge({
  balance,
  overtimeUnknown,
  overtimeSign,
  overtimeLabel,
  overtimeClass,
  fmt,
}: RequiredBadgeProps) {
  const { sollstunden, priorOvertime, requiredToday, remainingTimeMode } = balance
  return (
    <>
      <span className="font-medium text-gray-700 dark:text-gray-200">
        {overtimeUnknown ? <Skeleton className="w-10" /> : formatHours(requiredToday, fmt)} required
      </span>
      {remainingTimeMode !== 'until-daily-target' && (
        <>
          <span className="text-gray-400 dark:text-gray-500">(</span>
          <span className="font-medium text-gray-500 dark:text-gray-400">{formatHours(sollstunden, fmt)}</span>
          <span>target</span>
          {overtimeUnknown ? (
            <Skeleton className="w-14" />
          ) : (
            <>
              <span className="text-gray-300 dark:text-gray-600">{overtimeSign}</span>
              <span className={`font-medium ${overtimeClass}`}>
                {formatHours(Math.abs(priorOvertime), fmt)} {overtimeLabel}
              </span>
            </>
          )}
          <span className="text-gray-400 dark:text-gray-500">)</span>
        </>
      )}
    </>
  )
}
