import { DaySummaryBody, type DaySummaryData } from '../../../shared/DaySummaryBody'
import { formatHoursCompact } from '../../../shared/formatHours'
import type { TimeFormat } from '../../../shared/timeFormatStore'
import { Tooltip } from '../../../shared/Tooltip'
import { balanceBarStyle, type balanceScale } from '../barStyles'
import { overtimeTextClass } from '../monthTableRow'

export function BalanceCell({
  accumulatedOvertime,
  balScale,
  timeFormat,
  daySummaryData,
}: {
  accumulatedOvertime: number | null
  balScale: ReturnType<typeof balanceScale>
  timeFormat: TimeFormat
  daySummaryData: DaySummaryData
}) {
  return (
    <td
      className="px-1.5 py-[3px] w-16 border-r border-gray-200 text-right text-[11px] font-semibold tabular-nums dark:border-gray-700"
      style={accumulatedOvertime !== null ? balanceBarStyle(accumulatedOvertime, balScale) : {}}
    >
      <Tooltip content={<DaySummaryBody {...daySummaryData} timeFormat={timeFormat} dark />}>
        <span className="block w-full text-right">
          {/* Every past day carries the balance, not only the tracked ones — the
              question this column answers is "where do I stand as of this date". */}
          {accumulatedOvertime !== null && (
            <span className={overtimeTextClass(accumulatedOvertime)}>
              {accumulatedOvertime > 0 ? '+' : ''}
              {formatHoursCompact(accumulatedOvertime, timeFormat)}
            </span>
          )}
        </span>
      </Tooltip>
    </td>
  )
}
