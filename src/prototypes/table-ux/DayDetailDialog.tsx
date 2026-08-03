// PROTOTYPE — day drill-in used by variants A and B. Wired to the real DayTimeline, so edits
// here do persist. Delete with the directory.
import { createPortal } from 'react-dom'
import type { MonthRepository } from '../../infra/repositories/types'
import type { MonthView } from '../../shared/useMonthView'
import { DayTimeline } from '../../features/day/DayTimeline'
import { resolveAutoCategory } from '../../shared/autoCategory'

interface Props {
  date: string | null
  view: MonthView
  repository: MonthRepository
  onClose: () => void
}

export function DayDetailDialog({ date, view, repository, onClose }: Props) {
  if (!date) return null
  const { monthData, config } = view
  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-[100] cursor-default bg-black/25"
      />
      <div className="fixed left-1/2 top-1/2 z-[200] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b px-5 py-3 dark:border-gray-700">
          <p className="text-sm font-semibold">
            {new Date(date + 'T12:00').toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="Close day detail"
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <DayTimeline
            showTotals={false}
            date={date}
            windows={monthData[date]?.windows ?? []}
            repository={repository}
            autoCategory={resolveAutoCategory(monthData[date]?.autoCategoryOverride, config.autoCategory)}
            customCategories={config.customCategories}
            categoryOrder={config.categoryOrder}
            categoryDescriptions={config.categoryDescriptions}
          />
        </div>
      </div>
    </>,
    document.body,
  )
}
