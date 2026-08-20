import type { OfficeStats } from '../../../shared/officeStats'

export function OfficeBadge({ officeStats }: { officeStats: OfficeStats | null }) {
  if (!officeStats) return null

  return (
    <span className="rounded-lg border px-2.5 py-1 text-xs dark:border-gray-700">
      <span className="text-gray-500 dark:text-gray-400">Office </span>
      <span className="font-semibold tabular-nums">{officeStats.officePercent}%</span>
      <span className="ml-1 text-gray-500 dark:text-gray-400">
        ({officeStats.officeDays}/{officeStats.totalWorkDays})
      </span>
    </span>
  )
}
