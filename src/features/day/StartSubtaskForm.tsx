import { useState, useEffect } from 'react'
import { NowChip } from './NowChip'
import { nowHHMM } from '../../shared/worktime'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning, BlurCancelHint, type LiveSubtask } from './workPeriodShared'

interface StartSubtaskFormProps {
  categories: string[]
  defaultCategory: string
  onStart: (subtask: LiveSubtask) => void
  onCancel: () => void
  categoryDescriptions?: Record<string, string> | undefined
}

export function StartSubtaskForm({
  categories,
  defaultCategory,
  onStart,
  onCancel,
  categoryDescriptions,
}: StartSubtaskFormProps) {
  const [category, setCategory] = useState(defaultCategory)
  const [startedAt, setStartedAt] = useState('')
  const [note, setNote] = useState('')
  const isDirty = category !== defaultCategory || startedAt !== '' || note !== ''
  const { pendingCancel, handleBlur, handleFocus, cancelToken } = useBlurWarning(isDirty)
  useEffect(() => {
    if (cancelToken > 0) onCancel()
  }, [cancelToken, onCancel])

  function handleStart() {
    const time = startedAt || nowHHMM()
    onStart({ id: crypto.randomUUID(), category, hours: 0, startedAt: time, note: note.trim() || undefined })
  }

  const inputClass =
    'text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400'

  return (
    <div className="relative flex items-center gap-2 flex-wrap w-full" onBlur={handleBlur} onFocus={handleFocus}>
      {pendingCancel && <BlurCancelHint />}
      <CategoryPicker
        value={category}
        categories={categories}
        onChange={setCategory}
        compact
        focusOnMount
        categoryDescriptions={categoryDescriptions}
      />
      <NowChip
        aria-label="Subtask started at"
        onChange={setStartedAt}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStart()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleStart()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Note (optional)"
        aria-label="Subtask note"
        className={`${inputClass} flex-1 min-w-0 placeholder:text-gray-300 dark:placeholder:text-gray-600`}
      />
      <button
        type="button"
        onClick={handleStart}
        className="text-sm text-green-600 dark:text-green-400 font-medium hover:text-green-800 dark:hover:text-green-300 border border-green-200 dark:border-green-800 rounded px-2 py-1 shrink-0"
      >
        Start
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
