import { formatDate } from './formatDate'
export interface DayNavProps {
  selectedDate: string
  todayIso: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function DayNav({ selectedDate, todayIso, onPrev, onNext, onToday }: DayNavProps) {
  const isToday = selectedDate === todayIso
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label="Previous day"
        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        onClick={onPrev}
      >
        ← Prev
      </button>
      <div className="flex flex-1 items-center justify-center gap-2">
        <h2 className="text-xl font-semibold">{formatDate(selectedDate)}</h2>
        <button
          type="button"
          className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${isToday ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
          onClick={onToday}
          disabled={isToday}
          aria-label="Go to today"
        >
          Current
        </button>
      </div>
      <button
        type="button"
        aria-label="Next day"
        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        onClick={onNext}
      >
        Next →
      </button>
    </div>
  )
}
