import { STATUS_DOT, STATUS_LABEL } from '../../shared/statusColors'
import type { DisplayStatus } from '../../shared/statusColors'

const LEGEND_STATUSES: DisplayStatus[] = ['confirmed', 'needs-review', 'untracked', 'future', 'leave', 'non-working']

export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 ${className ?? ''}`}>
      {LEGEND_STATUSES.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  )
}
