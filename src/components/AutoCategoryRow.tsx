import { calculateAutoCategory } from '../domain/autoCategory'

interface Props {
  autoCategory: string | null
  workedHours: number
  manualTotal: number
}

export function AutoCategoryRow({ autoCategory, workedHours, manualTotal }: Props) {
  if (!autoCategory) return null

  const { hours, isOverbooked } = calculateAutoCategory(workedHours, manualTotal)

  return (
    <div
      aria-label="Auto category"
      className="flex items-center justify-between rounded-lg border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{autoCategory}</span>
        <span className="rounded bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
          auto
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold">{hours}h</span>
        {isOverbooked && (
          <span className="rounded bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">Overbooking</span>
        )}
      </div>
    </div>
  )
}
