import { formatHours } from '../../../shared/formatHours'
import type { TimeFormat } from '../../../shared/timeFormatStore'
import type { MonthOverview } from '../monthOverview'
import { pluralDays } from './pluralDays'

export function UntrackedBadge({ overview, timeFormat }: { overview: MonthOverview; timeFormat: TimeFormat }) {
  if (overview.untrackedCount <= 0) return null

  return (
    <span className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      <span className="font-semibold">
        {overview.untrackedCount} {pluralDays(overview.untrackedCount)} untracked
      </span>
      <span className="ml-1.5 tabular-nums">{formatHours(overview.missingHours, timeFormat)} missing</span>
    </span>
  )
}
