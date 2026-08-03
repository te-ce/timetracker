import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { CategoryPicker } from './CategoryPicker'
import { categoryLabel } from './categoryLabel'
import type { ActiveTracking } from './dayStreamModel'

interface TrackingBarProps {
  active: ActiveTracking | undefined
  now: string
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  /** False for a day that is over: live tracking gives way to writing the period down. */
  isToday: boolean
  onStart: (category: string) => void
  onAddPeriod: (start: string, end: string, category: string) => void
  onStop: () => void
  onStartSubtask: (category: string) => void
  onStopSubtask: () => void
}

/**
 * The single "what is happening right now" control. Only one thing is ever
 * tracked, so this bar has exactly one primary action at a time.
 */
export function TrackingBar({
  active,
  now,
  categories,
  defaultCategory,
  categoryDescriptions,
  isToday,
  onStart,
  onAddPeriod,
  onStop,
  onStartSubtask,
  onStopSubtask,
}: TrackingBarProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [category, setCategory] = useState(defaultCategory)
  const [seenDefault, setSeenDefault] = useState(defaultCategory)
  const [startingSubtask, setStartingSubtask] = useState(false)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [subtaskCategory, setSubtaskCategory] = useState(defaultCategory)

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  if (!active && !isToday) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">Log work</span>
        <input
          type="time"
          aria-label="New work period start"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <span className="text-gray-400">–</span>
        <input
          type="time"
          aria-label="New work period end"
          value={newEnd}
          onChange={(e) => setNewEnd(e.target.value)}
          className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <CategoryPicker
          value={category}
          categories={categories}
          onChange={setCategory}
          compact
          ariaLabel="Category for the new work period"
          categoryDescriptions={categoryDescriptions}
        />
        <button
          type="button"
          disabled={!newStart || !newEnd}
          onClick={() => {
            onAddPeriod(newStart, newEnd, category)
            setNewStart('')
            setNewEnd('')
          }}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          Add work period
        </button>
      </div>
    )
  }

  if (!active) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">Not tracking</span>
        <CategoryPicker
          value={category}
          categories={categories}
          onChange={setCategory}
          compact
          ariaLabel="Category to start"
          categoryDescriptions={categoryDescriptions}
        />
        <button
          type="button"
          onClick={() => onStart(category)}
          className="ml-auto rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          ▶ Start tracking at {now}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-700 dark:bg-emerald-950/30">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="font-mono text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
        {formatHours(active.elapsed, timeFormat)}
      </span>
      <span className="font-medium text-gray-800 dark:text-gray-100">{categoryLabel(active.category)}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {active.subtask ? 'subtask' : 'main'} · since {active.since}
      </span>
      <span className="ml-auto flex items-center gap-2">
        {active.subtask ? (
          <button
            type="button"
            onClick={onStopSubtask}
            className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            ■ Stop subtask → back to {categoryLabel(active.period.category)}
          </button>
        ) : startingSubtask ? (
          <span className="flex items-center gap-2">
            <CategoryPicker
              value={subtaskCategory}
              categories={categories}
              onChange={setSubtaskCategory}
              compact
              focusOnMount
              ariaLabel="Subtask category"
              categoryDescriptions={categoryDescriptions}
            />
            <button
              type="button"
              onClick={() => {
                onStartSubtask(subtaskCategory)
                setStartingSubtask(false)
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => setStartingSubtask(false)}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSubtaskCategory(active.period.category)
              setStartingSubtask(true)
            }}
            className="rounded-lg border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            ▶ Start subtask
          </button>
        )}
        <button
          type="button"
          onClick={onStop}
          className="rounded-lg bg-red-600 px-4 py-1 text-sm font-semibold text-white hover:bg-red-700"
        >
          ■ Stop work
        </button>
      </span>
    </div>
  )
}
