import { useState, useRef, useEffect } from 'react'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { calcSubtaskHours, parseDurationInput } from '../../shared/worktime'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning, BlurCancelHint, isTimedSubtask } from './workPeriodShared'

export function resolveSubtaskEdit(
  sl: WorkPeriodSubtask,
  category: string,
  note: string | undefined,
  start: string,
  end: string,
  hoursRaw: string,
  submode: 'timed' | 'decimal',
): { subtask: WorkPeriodSubtask; valid: boolean } {
  if (submode === 'timed') {
    if (!end) {
      if (!start) return { subtask: sl, valid: false }
      return { subtask: { ...sl, category, startedAt: start, stoppedAt: undefined, note }, valid: true }
    }
    const h = calcSubtaskHours(start, end)
    if (!h || h <= 0) return { subtask: sl, valid: false }
    return { subtask: { ...sl, category, hours: h, startedAt: start, stoppedAt: end, note }, valid: true }
  }
  const h = parseDurationInput(hoursRaw)
  if (!h || h <= 0) return { subtask: sl, valid: false }
  return { subtask: { ...sl, category, hours: h, startedAt: undefined, stoppedAt: undefined, note }, valid: true }
}

interface SubtaskEditFormProps {
  sl: WorkPeriodSubtask
  periodId: string
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  stripeBg: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  onDone: () => void
}

export function SubtaskEditForm({
  sl,
  periodId,
  date,
  categories,
  categoryDescriptions,
  stripeBg,
  mutations,
  onDone,
}: SubtaskEditFormProps) {
  const timed = isTimedSubtask(sl)
  const hasClockTime = !!sl.startedAt
  const [editCategory, setEditCategory] = useState(sl.category)
  const [editHours, setEditHours] = useState(String(sl.hours))
  const [editNote, setEditNote] = useState(sl.note ?? '')
  const [editStart, setEditStart] = useState(sl.startedAt ?? '')
  const [editEnd, setEditEnd] = useState(sl.stoppedAt ?? '')
  const [submode, setSubmode] = useState<'timed' | 'decimal'>(hasClockTime ? 'timed' : 'decimal')
  const hoursInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const isDirty =
    editCategory !== sl.category ||
    editNote !== (sl.note ?? '') ||
    editHours !== String(sl.hours) ||
    editStart !== (sl.startedAt ?? '') ||
    editEnd !== (sl.stoppedAt ?? '')
  const { pendingCancel, handleBlur, handleFocus, cancelToken } = useBlurWarning(isDirty)
  useEffect(() => {
    if (cancelToken > 0) onDone()
  }, [cancelToken, onDone])

  useEffect(() => {
    if (submode === 'timed') endInputRef.current?.focus()
    else hoursInputRef.current?.focus()
  }, [submode])

  function commit() {
    const { subtask, valid } = resolveSubtaskEdit(
      sl,
      editCategory,
      editNote.trim() || undefined,
      editStart,
      editEnd,
      editHours,
      submode,
    )
    if (!valid) {
      onDone()
      return
    }
    mutations.addSubtask.mutate({ date, periodId, subtask })
    onDone()
  }

  function switchToDecimal() {
    const hours = editEnd ? calcSubtaskHours(editStart, editEnd) : sl.hours
    setEditHours(String(Math.round(hours * 100) / 100))
    setSubmode('decimal')
  }

  const inputClass =
    'text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400'
  const kd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') onDone()
  }

  return (
    <div
      data-testid="subtask-row"
      className={`relative flex items-center gap-2 text-sm min-h-[2.625rem] flex-wrap ${stripeBg}`}
      onBlur={handleBlur}
      onFocus={handleFocus}
    >
      {pendingCancel && <BlurCancelHint />}
      {submode === 'timed' ? (
        <span className="w-12 text-right font-mono text-sm tabular-nums text-gray-500 dark:text-gray-400 shrink-0 whitespace-nowrap">
          {editEnd ? formatHours(calcSubtaskHours(editStart, editEnd), timeFormat) : formatHours(sl.hours, timeFormat)}
        </span>
      ) : (
        <input
          type="text"
          value={editHours}
          onChange={(e) => setEditHours(e.target.value)}
          onKeyDown={kd}
          aria-label="Subtask hours"
          ref={hoursInputRef}
          className={`${inputClass} w-12 text-right`}
        />
      )}
      <CategoryPicker
        value={editCategory}
        categories={categories}
        onChange={setEditCategory}
        compact
        categoryDescriptions={categoryDescriptions}
      />
      {submode === 'timed' && (
        <>
          <input
            type="text"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            onKeyDown={kd}
            aria-label="Subtask start time"
            className={`${inputClass} w-20`}
          />
          <span className="text-sm text-gray-400">–</span>
          <input
            type="text"
            value={editEnd}
            onChange={(e) => setEditEnd(e.target.value)}
            onKeyDown={kd}
            placeholder="now"
            aria-label="Subtask end time"
            ref={endInputRef}
            className={`${inputClass} w-20 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
          />
          {!editEnd && (
            <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 shrink-0">
              running
            </span>
          )}
          {timed && (
            <button
              type="button"
              onClick={switchToDecimal}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 shrink-0"
            >
              use decimal
            </button>
          )}
        </>
      )}
      <input
        type="text"
        value={editNote}
        onChange={(e) => setEditNote(e.target.value)}
        onKeyDown={kd}
        placeholder="Note (optional)"
        aria-label="Subtask note"
        className={`${inputClass} flex-1 min-w-0 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
      />
      <button
        type="button"
        onClick={commit}
        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 shrink-0"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
      >
        Cancel
      </button>
    </div>
  )
}
