import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { Tooltip } from '../../shared/Tooltip'
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
  onStart: (category: string, startTime?: string) => void
  onAddPeriod: (start: string, end: string, category: string) => void
  onStop: () => void
  onStartSubtask: (category: string, startTime?: string) => void
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
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [subtaskCategory, setSubtaskCategory] = useState(active?.period.category ?? defaultCategory)
  const [seenPeriodCategory, setSeenPeriodCategory] = useState(active?.period.category ?? defaultCategory)
  const [editingStartTime, setEditingStartTime] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [editingSubtaskStartTime, setEditingSubtaskStartTime] = useState(false)
  const [customSubtaskStart, setCustomSubtaskStart] = useState('')

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  if (active && active.period.category !== seenPeriodCategory) {
    setSeenPeriodCategory(active.period.category)
    setSubtaskCategory(active.period.category)
  }

  if (!active && !isToday) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">Log work</span>
        <Tooltip content="This is a past day">
          <button type="button" aria-label="This is a past day" className="text-amber-500 dark:text-amber-400">
            ⚠
          </button>
        </Tooltip>
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
        {editingStartTime ? (
          <span className="ml-auto flex items-center gap-2">
            <input
              type="time"
              aria-label="Start time"
              value={customStart || now}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => {
                onStart(category, customStart || now)
                setEditingStartTime(false)
                setCustomStart('')
              }}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              ▶ Start tracking
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingStartTime(false)
                setCustomStart('')
              }}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </span>
        ) : (
          <span className="ml-auto inline-flex items-stretch rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => onStart(category)}
              className="rounded-l-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              ▶ Start tracking at {now}
            </button>
            <button
              type="button"
              aria-label="Edit start time"
              title="Edit start time"
              onClick={() => {
                setCustomStart(now)
                setEditingStartTime(true)
              }}
              className="rounded-r-lg border-l border-emerald-700/40 bg-emerald-600 px-2 py-1.5 text-sm text-white hover:bg-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              ✎
            </button>
          </span>
        )}
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
            className="inline-flex h-7 items-center justify-center rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
          >
            ■ Stop subtask → back to {categoryLabel(active.period.category)}
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <CategoryPicker
              value={subtaskCategory}
              categories={categories}
              onChange={setSubtaskCategory}
              compact
              ariaLabel="Subtask category"
              categoryDescriptions={categoryDescriptions}
            />
            {editingSubtaskStartTime && (
              <input
                type="time"
                aria-label="Subtask start time"
                value={customSubtaskStart || now}
                onChange={(e) => setCustomSubtaskStart(e.target.value)}
                className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            )}
            <span className="inline-flex items-stretch rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => {
                  onStartSubtask(subtaskCategory, editingSubtaskStartTime ? customSubtaskStart || now : undefined)
                  setEditingSubtaskStartTime(false)
                  setCustomSubtaskStart('')
                }}
                className="inline-flex h-7 items-center justify-center rounded-l-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                ▶ Start subtask
              </button>
              <button
                type="button"
                aria-label="Edit subtask start time"
                title="Edit subtask start time"
                onClick={() => {
                  setCustomSubtaskStart(now)
                  setEditingSubtaskStartTime(true)
                }}
                className="inline-flex h-7 items-center justify-center rounded-r-lg border border-l-0 border-emerald-300 px-1.5 text-sm text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
              >
                ✎
              </button>
            </span>
            {editingSubtaskStartTime && (
              <button
                type="button"
                onClick={() => {
                  setEditingSubtaskStartTime(false)
                  setCustomSubtaskStart('')
                }}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                Cancel
              </button>
            )}
          </span>
        )}
        <button
          type="button"
          onClick={onStop}
          className="inline-flex h-7 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
        >
          ■ Stop work
        </button>
      </span>
    </div>
  )
}
