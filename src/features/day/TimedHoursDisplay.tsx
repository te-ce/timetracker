import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { calcSubtaskHours } from '../../shared/worktime'
export interface TimedHoursDisplayProps {
  editEnd: string
  editStart: string
  sl: WorkPeriodSubtask
}

export function TimedHoursDisplay({ editEnd, editStart, sl }: TimedHoursDisplayProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  return (
    <span className="w-12 text-right font-mono text-sm tabular-nums text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
      {editEnd ? formatHours(calcSubtaskHours(editStart, editEnd), timeFormat) : formatHours(sl.hours, timeFormat)}
    </span>
  )
}
