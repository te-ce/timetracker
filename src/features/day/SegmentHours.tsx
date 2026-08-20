import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { DaySegment } from './daySegments'

export interface SegmentHoursProps {
  segment: DaySegment
}

export function SegmentHours({ segment }: SegmentHoursProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  return (
    <span
      className={`w-14 shrink-0 text-right font-mono text-sm tabular-nums ${
        segment.live ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
      }`}
    >
      {formatHours(segment.hours, timeFormat)}
    </span>
  )
}
