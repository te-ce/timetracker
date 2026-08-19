import { useState, useRef, useEffect } from 'react'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'
import { parseDurationInput } from '../../shared/worktime'
import { CategoryPicker } from './CategoryPicker'
import { categoryDisplay } from './categoryLabel'
import { useBlurWarning, BlurCancelHint } from './workPeriodShared'

interface SubtaskFormProps {
  categories: string[]
  onAdd: (subtask: WorkPeriodSubtask) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
}

export function SubtaskForm({
  categories,
  onAdd,
  onCancel,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
}: SubtaskFormProps) {
  const [category, setCategory] = useState(categories[0] ?? UNCATEGORIZED_CATEGORY)
  const [durationRaw, setDurationRaw] = useState('')
  const [note, setNote] = useState('')
  const durationInputRef = useRef<HTMLInputElement>(null)
  const isDirty = durationRaw !== '' || note !== ''
  const { pendingCancel, handleBlur, handleFocus, cancelToken } = useBlurWarning(isDirty)
  useEffect(() => {
    if (cancelToken > 0) onCancel()
  }, [cancelToken, onCancel])
  useEffect(() => {
    durationInputRef.current?.focus()
  }, [])

  function handleSubmit() {
    const hours = parseDurationInput(durationRaw)
    if (!hours || hours <= 0) return
    onAdd({ id: crypto.randomUUID(), category, hours, note: note.trim() || undefined })
    setDurationRaw('')
    setNote('')
  }

  const inputClass =
    'text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400'
  const kd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="relative flex items-center gap-2 flex-wrap w-full" onBlur={handleBlur} onFocus={handleFocus}>
      {pendingCancel && <BlurCancelHint />}
      <input
        type="text"
        placeholder="1.5 or 1:30"
        value={durationRaw}
        onChange={(e) => setDurationRaw(e.target.value)}
        onKeyDown={kd}
        aria-label="Subtask duration"
        ref={durationInputRef}
        className={`${inputClass} w-20 text-right`}
      />
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      />
      {categoryDisplay(category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).secondary && (
        <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">
          (
          {categoryDisplay(category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).secondary}
          )
        </span>
      )}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={kd}
        placeholder="Note (optional)"
        aria-label="Subtask note"
        className={`${inputClass} flex-1 min-w-0 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-1 shrink-0"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 shrink-0"
      >
        Cancel
      </button>
    </div>
  )
}
