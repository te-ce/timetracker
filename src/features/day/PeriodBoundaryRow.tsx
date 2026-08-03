import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { CategoryPicker } from './CategoryPicker'
import { BlurCancelHint, useBlurWarning } from './workPeriodShared'

interface PeriodBoundaryRowProps {
  period: WorkPeriod
  ordinal: number
  duration: number
  running: boolean
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  editing: boolean
  onStartEditing: () => void
  onStopEditing: () => void
  onSaveTimes: (start: string, end: string | null) => void
  onChangeCategory: (category: string) => void
  onDelete: () => void
}

/** Announces a WorkPeriod in the timeline: when it ran, how long, and what it was. */
export function PeriodBoundaryRow({
  period,
  ordinal,
  duration,
  running,
  categories,
  categoryDescriptions,
  editing,
  onStartEditing,
  onStopEditing,
  onSaveTimes,
  onChangeCategory,
  onDelete,
}: PeriodBoundaryRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [start, setStart] = useState(period.start)
  const [end, setEnd] = useState(period.end ?? '')
  const [seenEditing, setSeenEditing] = useState(editing)
  const startInputRef = useRef<HTMLInputElement>(null)
  const label = `work period ${ordinal}, ${period.start} to ${period.end ?? 'now'}`
  const isDirty = start !== period.start || (end || null) !== period.end
  const { pendingCancel, handleBlur, handleFocus, cancelToken } = useBlurWarning(isDirty)

  // Focus leaving an untouched editor drops it straight away; a changed one asks
  // once first. Same contract as the subtask editor. Only a *new* cancel token
  // closes the editor — `onStopEditing` is a fresh closure on every parent
  // render, so depending on it would re-close the editor the moment it reopens.
  const stopEditing = useEffectEvent(onStopEditing)
  useEffect(() => {
    if (cancelToken > 0) stopEditing()
  }, [cancelToken])

  // Opening the editor — from this row or from one of its main stretches —
  // starts from what is stored and puts the caret on the start time.
  if (editing !== seenEditing) {
    setSeenEditing(editing)
    if (editing) {
      setStart(period.start)
      setEnd(period.end ?? '')
    }
  }

  useEffect(() => {
    if (editing) startInputRef.current?.focus()
  }, [editing])

  function save() {
    onSaveTimes(start, end || null)
    onStopEditing()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') onStopEditing()
  }

  return (
    <li
      aria-label={`Work period ${ordinal}, ${period.start} to ${period.end ?? 'now'}`}
      className="flex flex-wrap items-center gap-3 pb-0.5 pt-3 text-xs"
    >
      {editing ? (
        <span className="relative flex items-center gap-1" onBlur={handleBlur} onFocus={handleFocus}>
          {pendingCancel && <BlurCancelHint />}
          <input
            ref={startInputRef}
            type="time"
            aria-label={`Work period ${ordinal} start`}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onKeyDown={handleKeyDown}
            className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <span className="text-gray-400">–</span>
          <input
            type="time"
            aria-label={`Work period ${ordinal} end`}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onKeyDown={handleKeyDown}
            className="rounded border px-1.5 py-0.5 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <button type="button" onClick={save} className="ml-1 font-medium text-indigo-600 dark:text-indigo-400">
            Save
          </button>
          <button type="button" onClick={onStopEditing} className="ml-1 text-gray-500 dark:text-gray-400">
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onStartEditing}
          aria-label={`Edit times of ${label}`}
          className={`font-mono font-semibold tabular-nums hover:text-indigo-600 dark:hover:text-indigo-400 ${
            running ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          {period.start} → {period.end ?? 'now'}
        </button>
      )}
      <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
        {formatHours(duration, timeFormat)}
      </span>
      <CategoryPicker
        value={period.category}
        categories={categories}
        onChange={onChangeCategory}
        compact
        ariaLabel={`Main category of ${label}`}
        categoryDescriptions={categoryDescriptions}
      />
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        work period {ordinal}
        {ordinal === 1 ? ' · first start of the day' : ''}
        {running ? ' · running' : ''}
      </span>
      <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="px-1 text-gray-400 hover:text-red-500 dark:text-gray-500"
      >
        ×
      </button>
    </li>
  )
}
