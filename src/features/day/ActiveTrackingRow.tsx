import { useState } from 'react'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { CategoryPicker } from './CategoryPicker'
import { categoryDisplay } from './categoryLabel'
import type { ActiveTracking } from './dayStreamModel'
import { LiveElapsed } from './LiveElapsed'
import { TimeNowField } from './TimeNowField'

export interface ActiveTrackingRowProps {
  active: ActiveTracking
  now: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onStop: (stopTime: string) => void
  onStartSubtask: (category: string, startTime: string) => void
  onStopSubtask: (stopTime: string) => void
}

export function ActiveTrackingRow({
  active,
  now,
  categories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onStop,
  onStartSubtask,
  onStopSubtask,
}: ActiveTrackingRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [subtaskCategory, setSubtaskCategory] = useState(active.period.category)
  const [seenPeriodCategory, setSeenPeriodCategory] = useState(active.period.category)
  const [customTime, setCustomTime] = useState<string | null>(null)

  if (active.period.category !== seenPeriodCategory) {
    setSeenPeriodCategory(active.period.category)
    setSubtaskCategory(active.period.category)
  }

  const startSubtask = () => {
    onStartSubtask(subtaskCategory, customTime ?? now)
    setCustomTime(null)
  }

  const stopSubtask = () => {
    onStopSubtask(customTime ?? now)
    setCustomTime(null)
  }

  const stopWork = () => {
    onStop(customTime ?? now)
    setCustomTime(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-700 dark:bg-emerald-950/30">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        <LiveElapsed since={active.since} timeFormat={timeFormat} />
      </span>
      <span className="font-medium text-gray-800 dark:text-gray-100">
        {
          categoryDisplay(active.category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false)
            .primary
        }
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {active.subtask ? 'subtask' : 'main'} · since {active.since}
      </span>
      <span className="ml-auto flex items-center gap-2">
        <TimeNowField now={now} value={customTime} onChange={setCustomTime} ariaLabel="Time" onConfirm={stopWork} />
        {active.subtask ? (
          <button
            type="button"
            onClick={stopSubtask}
            className="inline-flex h-7 items-center justify-center rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            ■ Stop subtask → back to{' '}
            {
              categoryDisplay(
                active.period.category,
                categoryDescriptions ?? {},
                preferCategoryDescriptionAsPrimary ?? false,
              ).primary
            }
          </button>
        ) : (
          <>
            <CategoryPicker
              value={subtaskCategory}
              categories={categories}
              onChange={setSubtaskCategory}
              compact
              ariaLabel="Subtask category"
              categoryDescriptions={categoryDescriptions}
              preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
            />
            <button
              type="button"
              onClick={startSubtask}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              ▶ Start subtask
            </button>
          </>
        )}
        <button
          type="button"
          onClick={stopWork}
          className="inline-flex h-7 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
        >
          ■ Stop work
        </button>
      </span>
    </div>
  )
}

/**
 * The single "what is happening right now" control. Only one thing is ever
 * tracked, so this bar has exactly one primary action at a time.
 */
