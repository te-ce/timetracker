import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'

export function LiveWindowBadge({ elapsed, fmt }: { elapsed: number; fmt: TimeFormat }) {
  return (
    <span className="font-medium text-green-700 dark:text-green-400 tabular-nums" aria-hidden="true">
      {formatHours(elapsed, fmt)} current
    </span>
  )
}
