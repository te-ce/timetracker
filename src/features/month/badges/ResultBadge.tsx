import { Skeleton } from '../Skeleton'

export function ResultBadge({
  overtimeUnknown,
  resultUnknown,
  isTodayOver,
  resultLabel,
}: {
  overtimeUnknown: boolean
  resultUnknown: boolean
  isTodayOver: boolean
  resultLabel: string
}) {
  const toneClass = overtimeUnknown
    ? ''
    : isTodayOver
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'

  return (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ${toneClass}`}>
      {resultUnknown ? <Skeleton className="w-16" /> : resultLabel}
    </span>
  )
}
