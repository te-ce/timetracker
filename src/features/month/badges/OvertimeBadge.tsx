import type { TimeFormat } from '../../../shared/timeFormatStore'
import { balanceInk, formatSignedHours } from '../monthBalanceFormat'
import { Skeleton } from '../Skeleton'

export function OvertimeBadge({
  overtimeUnknown,
  priorOvertime,
  timeFormat,
}: {
  overtimeUnknown: boolean
  priorOvertime: number
  timeFormat: TimeFormat
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs dark:border-gray-600">
      <span className="text-gray-500 dark:text-gray-400">Overtime</span>
      {overtimeUnknown ? (
        <Skeleton className="w-10" />
      ) : (
        <span className={`font-semibold tabular-nums ${balanceInk(priorOvertime)}`}>
          {formatSignedHours(priorOvertime, timeFormat)}
        </span>
      )}
    </span>
  )
}
