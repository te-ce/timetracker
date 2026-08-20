import { useEffect, useEffectEvent, useState } from 'react'
import type { WorkPeriod } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning } from './workPeriodShared'
import { PeriodTimeButton } from './PeriodTimeButton'
import { PeriodEditFields } from './PeriodEditFields'

interface PeriodBoundaryRowProps {
  period: WorkPeriod
  ordinal: number
  duration: number
  running: boolean
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  editing: boolean
  onStartEditing: () => void
  onStopEditing: () => void
  onSaveTimes: (start: string, end: string | null) => void
  onChangeCategory: (category: string) => void
  onDelete: () => void
}

function isPeriodTimesDirty(start: string, end: string, period: WorkPeriod): boolean {
  return start !== period.start || (end || null) !== period.end
}

function periodLabelSuffix(ordinal: number, running: boolean): string {
  const first = ordinal === 1 ? ' · first start of the day' : ''
  const live = running ? ' · running' : ''
  return `${first}${live}`
}

export function PeriodBoundaryRow({
  period,
  ordinal,
  duration,
  running,
  categories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
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
  const label = `work period ${ordinal}, ${period.start} to ${period.end ?? 'now'}`
  const isDirty = isPeriodTimesDirty(start, end, period)
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
        <PeriodEditFields
          ordinal={ordinal}
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          pendingCancel={pendingCancel}
          handleBlur={handleBlur}
          handleFocus={handleFocus}
          onSave={save}
          onCancel={onStopEditing}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <PeriodTimeButton period={period} running={running} label={label} onStartEditing={onStartEditing} />
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
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        work period {ordinal}
        {periodLabelSuffix(ordinal, running)}
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
