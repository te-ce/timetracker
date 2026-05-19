import type { Category } from '../repositories/types'

interface Props {
  autoCategory: Category | null
  workedHours: number
  manualTotal: number
}

export function AutoCategoryRow({ autoCategory, workedHours, manualTotal }: Props) {
  if (!autoCategory) return null

  const remaining = workedHours - manualTotal
  const hours = Math.max(0, remaining)
  const isOverbooked = remaining < 0

  return (
    <div
      aria-label="Auto category"
      className="flex items-center justify-between rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 px-4 py-2.5"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{autoCategory}</span>
        <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
          auto
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold">{hours}h</span>
        {isOverbooked && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Overbooking
          </span>
        )}
      </div>
    </div>
  )
}
