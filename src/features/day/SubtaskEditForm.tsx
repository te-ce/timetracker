import { resolveSubtaskEdit } from './resolveSubtaskEdit'
import { BlurCancelHint } from './BlurCancelHint'
import { inputClass } from './subtaskFieldClass'
import { useState, useRef, useEffect } from 'react'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { calcSubtaskHours } from '../../shared/worktime'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning, isTimedSubtask } from './workPeriodShared'
import { TimedRangeFields } from './TimedRangeFields'
import { SubtaskHoursField } from './SubtaskHoursField'

function isSubtaskEditDirty(
  sl: WorkPeriodSubtask,
  editCategory: string,
  editNote: string,
  editHours: string,
  editStart: string,
  editEnd: string,
): boolean {
  return (
    editCategory !== sl.category ||
    editNote !== (sl.note ?? '') ||
    editHours !== String(sl.hours) ||
    editStart !== (sl.startedAt ?? '') ||
    editEnd !== (sl.stoppedAt ?? '')
  )
}

interface SubtaskEditFormProps {
  sl: WorkPeriodSubtask
  periodId: string
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
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
  preferCategoryDescriptionAsPrimary,
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
  const isDirty = isSubtaskEditDirty(sl, editCategory, editNote, editHours, editStart, editEnd)
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
      <SubtaskHoursField
        submode={submode}
        editEnd={editEnd}
        editStart={editStart}
        sl={sl}
        editHours={editHours}
        setEditHours={setEditHours}
        kd={kd}
        hoursInputRef={hoursInputRef}
      />
      <CategoryPicker
        value={editCategory}
        categories={categories}
        onChange={setEditCategory}
        compact
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      <TimedRangeFields
        submode={submode}
        editStart={editStart}
        setEditStart={setEditStart}
        editEnd={editEnd}
        setEditEnd={setEditEnd}
        endInputRef={endInputRef}
        kd={kd}
        timed={timed}
        switchToDecimal={switchToDecimal}
      />
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
