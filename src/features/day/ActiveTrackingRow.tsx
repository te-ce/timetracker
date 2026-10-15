import { useState } from 'react'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { endsAfterStart, parseMinutes } from '../../shared/worktime'
import { CategoryPicker } from './CategoryPicker'
import { categoryDisplay } from './categoryLabel'
import type { ActiveTracking } from './dayStreamModel'
import { LiveElapsed } from './LiveElapsed'
import { InvalidRangeHint } from './InvalidRangeHint'
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

/** Only a hand-picked time can be wrong; stopping at now within the start minute is a valid zero-length period. */
function customTimeProblems(
  active: ActiveTracking,
  customTime: string | null,
): { stopTooEarly: boolean; startTooEarly: boolean } {
  if (customTime === null) return { stopTooEarly: false, startTooEarly: false }
  return {
    stopTooEarly: !endsAfterStart(active.since, customTime),
    startTooEarly: parseMinutes(customTime) < parseMinutes(active.period.start),
  }
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

  const { stopTooEarly, startTooEarly } = customTimeProblems(active, customTime)

  const startSubtask = () => {
    onStartSubtask(subtaskCategory, customTime ?? now)
    setCustomTime(null)
  }

  const stopSubtask = () => {
    onStopSubtask(customTime ?? now)
    setCustomTime(null)
  }

  const stopWork = () => {
    if (stopTooEarly) return
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
        {stopTooEarly && <InvalidRangeHint>Pick a time after {active.since}</InvalidRangeHint>}
        {active.subtask ? (
          <button
            type="button"
            onClick={stopSubtask}
            disabled={stopTooEarly}
            className="inline-flex h-7 items-center justify-center disabled:opacity-40 rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
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
              disabled={startTooEarly}
              className="inline-flex h-7 items-center justify-center disabled:opacity-40 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              ▶ Start subtask
            </button>
          </>
        )}
        <button
          type="button"
          onClick={stopWork}
          disabled={stopTooEarly}
          className="inline-flex h-7 items-center justify-center disabled:opacity-40 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
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
