import { useState } from 'react'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { CategoryPicker } from './CategoryPicker'
import { categoryDisplay } from './categoryLabel'
import type { ActiveTracking } from './dayStreamModel'
import { LiveElapsed } from './LiveElapsed'
import { TimeNowField } from './TimeNowField'

interface TrackingBarProps {
  active: ActiveTracking | undefined
  now: string
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  /** False for a day that is over: live tracking gives way to writing the period down. */
  isToday: boolean
  onStart: (category: string, startTime: string) => void
  onAddPeriod: (start: string, end: string, category: string) => void
  onStop: (stopTime: string) => void
  onStartSubtask: (category: string, startTime: string) => void
  onStopSubtask: (stopTime: string) => void
}

interface LogPastWorkRowProps {
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onAddPeriod: (start: string, end: string, category: string) => void
}

function LogPastWorkRow({
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onAddPeriod,
}: LogPastWorkRowProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [seenDefault, setSeenDefault] = useState(defaultCategory)
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  const canAdd = Boolean(newStart && newEnd)
  const addPeriod = () => {
    if (!canAdd) return
    onAddPeriod(newStart, newEnd, category)
    setNewStart('')
    setNewEnd('')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-sm dark:border-gray-700">
      <span className="text-gray-500 dark:text-gray-400">Log work</span>
      <input
        type="time"
        aria-label="New work period start"
        value={newStart}
        onChange={(e) => setNewStart(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addPeriod()}
        className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <span className="text-gray-400">–</span>
      <input
        type="time"
        aria-label="New work period end"
        value={newEnd}
        onChange={(e) => setNewEnd(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addPeriod()}
        className="rounded border px-1.5 py-1 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        ariaLabel="Category for the new work period"
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <button
        type="button"
        disabled={!canAdd}
        onClick={addPeriod}
        className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        Add work period
      </button>
    </div>
  )
}

interface NotTrackingRowProps {
  now: string
  categories: string[]
  defaultCategory: string
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onStart: (category: string, startTime: string) => void
}

function NotTrackingRow({
  now,
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onStart,
}: NotTrackingRowProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [seenDefault, setSeenDefault] = useState(defaultCategory)
  const [customStart, setCustomStart] = useState<string | null>(null)

  if (defaultCategory !== seenDefault) {
    setSeenDefault(defaultCategory)
    setCategory(defaultCategory)
  }

  const start = () => {
    onStart(category, customStart ?? now)
    setCustomStart(null)
  }

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
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <span className="ml-auto flex items-center gap-2">
        <TimeNowField
          now={now}
          value={customStart}
          onChange={setCustomStart}
          ariaLabel="Start time"
          onConfirm={start}
        />
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          ▶ Start tracking
        </button>
      </span>
    </div>
  )
}

interface ActiveTrackingRowProps {
  active: ActiveTracking
  now: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onStop: (stopTime: string) => void
  onStartSubtask: (category: string, startTime: string) => void
  onStopSubtask: (stopTime: string) => void
}

function ActiveTrackingRow({
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
export function TrackingBar({
  active,
  now,
  categories,
  defaultCategory,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  isToday,
  onStart,
  onAddPeriod,
  onStop,
  onStartSubtask,
  onStopSubtask,
}: TrackingBarProps) {
  if (active) {
    return (
      <ActiveTrackingRow
        active={active}
        now={now}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onStop={onStop}
        onStartSubtask={onStartSubtask}
        onStopSubtask={onStopSubtask}
      />
    )
  }

  if (!isToday) {
    return (
      <LogPastWorkRow
        categories={categories}
        defaultCategory={defaultCategory}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onAddPeriod={onAddPeriod}
      />
    )
  }

  return (
    <NotTrackingRow
      now={now}
      categories={categories}
      defaultCategory={defaultCategory}
      categoryDescriptions={categoryDescriptions}
      preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      onStart={onStart}
    />
  )
}
