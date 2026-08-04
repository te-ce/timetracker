import { sprintDayProgress } from './sprint'
import type { Sprint } from './sprint'

interface Props {
  sprint: Sprint
  sprintIndex: number | null
  onSprintIndexChange: (index: number | null) => void
  today: string
}

function sprintDays(start: string, end: string): string[] {
  const days: string[] = []
  const cursor = new Date(start)
  const endDate = new Date(end)
  while (cursor <= endDate) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

export function SprintNavigation({ sprint, sprintIndex, onSprintIndexChange, today }: Props) {
  const activeIndex = sprint.index
  const progress = sprintDayProgress(sprint, today)
  const days = sprintDays(sprint.start, sprint.end)

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => onSprintIndexChange(activeIndex - 1)}
          aria-label="Previous sprint"
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          ← Prev
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <h2 className="text-lg font-semibold">Sprint {sprint.index + 1}</h2>
          <button
            type="button"
            onClick={() => onSprintIndexChange(null)}
            className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity dark:border-gray-700 ${sprintIndex === null ? 'text-gray-400 dark:text-gray-500 opacity-40 cursor-default pointer-events-none' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40'}`}
            aria-disabled={sprintIndex === null}
          >
            Current
          </button>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            {sprint.start} → {sprint.end}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSprintIndexChange(activeIndex + 1)}
          aria-label="Next sprint"
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          Next →
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {days.map((day, i) => {
            const isPast = i + 1 < progress.day
            const isToday = i + 1 === progress.day
            return (
              <div
                key={day}
                title={day}
                className={`h-1.5 flex-1 rounded-full ${
                  isToday
                    ? 'bg-indigo-500'
                    : isPast
                      ? 'bg-indigo-200 dark:bg-indigo-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                }`}
              />
            )
          })}
        </div>
        <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          Day {progress.day} of {progress.total}
        </span>
      </div>
    </div>
  )
}
