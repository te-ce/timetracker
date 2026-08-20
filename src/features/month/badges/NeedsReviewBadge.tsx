import { pluralDays } from './pluralDays'

export function NeedsReviewBadge({ needsReviewCount }: { needsReviewCount: number }) {
  if (needsReviewCount <= 0) return null

  return (
    <span className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
      {needsReviewCount} {pluralDays(needsReviewCount)} to review
    </span>
  )
}
