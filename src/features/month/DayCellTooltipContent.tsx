import { DaySummaryBody, type DaySummaryData } from '../../shared/DaySummaryBody'
import type { DayStatus } from '../../shared/dayStatus'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { STATUS_NAME } from './dayCellStatus'

export function DayCellTooltipContent({
  status,
  summaryData,
  note,
  timeFormat,
}: {
  status: DayStatus
  summaryData: DaySummaryData | undefined
  note: string | undefined
  timeFormat: TimeFormat
}) {
  return (
    <div>
      {summaryData ? (
        <DaySummaryBody {...summaryData} timeFormat={timeFormat} dark />
      ) : (
        <p className="font-semibold">{STATUS_NAME[status]}</p>
      )}
      {note && <p className="mt-1.5 border-t border-gray-600 pt-1.5 whitespace-pre-wrap text-gray-200">{note}</p>}
    </div>
  )
}
