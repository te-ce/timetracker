import { useState, useRef, useEffect } from 'react'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { parseMinutes, nowHHMM } from '../../shared/worktime'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning, BlurCancelHint, type LiveSubtask } from './workPeriodShared'

interface LiveSubtaskBannerProps {
  subtask: LiveSubtask
  periodId: string
  date: string
  nowTime: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
}

export function LiveSubtaskBanner({
  subtask,
  periodId,
  date,
  nowTime,
  categories,
  mutations,
  categoryDescriptions,
}: LiveSubtaskBannerProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [editingCategory, setEditingCategory] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [editStart, setEditStart] = useState(subtask.startedAt)
  const [editEnd, setEditEnd] = useState('')
  const [timeError, setTimeError] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState(subtask.note ?? '')
  const noteInputRef = useRef<HTMLInputElement>(null)
  const subtaskStartInputRef = useRef<HTMLInputElement>(null)
  const subtaskEndInputRef = useRef<HTMLInputElement>(null)
  const focusEndRef = useRef(false)
  const timeFormat = useTimeFormatStore((s) => s.format)
  const {
    pendingCancel: catPendingCancel,
    handleBlur: catHandleBlur,
    handleFocus: catHandleFocus,
    reset: resetCatPending,
    cancelToken: catCancelToken,
  } = useBlurWarning(false)

  const [seenCatCancelToken, setSeenCatCancelToken] = useState(catCancelToken)
  if (catCancelToken !== seenCatCancelToken) {
    setSeenCatCancelToken(catCancelToken)
    setEditingCategory(false)
  }

  useEffect(() => {
    if (editingNote) noteInputRef.current?.focus()
  }, [editingNote])

  useEffect(() => {
    if (!editingTime) return
    if (focusEndRef.current) {
      subtaskEndInputRef.current?.focus()
    } else {
      subtaskStartInputRef.current?.focus()
    }
  }, [editingTime])
  const elapsedHours = (() => {
    const startMins = parseMinutes(subtask.startedAt)
    const endMins = parseMinutes(nowTime)
    const diff = endMins - startMins
    if (diff < 0 && diff > -5) return 0
    const adjusted = diff < 0 ? diff + 24 * 60 : diff
    return adjusted / 60
  })()
  const elapsed = formatHours(elapsedHours, timeFormat)
  const description = categoryDescriptions?.[subtask.category]

  function changeCategory(cat: string) {
    mutations.addSubtask.mutate({ date, periodId, subtask: { ...subtask, category: cat } })
    setEditingCategory(false)
    resetCatPending()
  }

  function enterSubtaskEditMode(focusEnd: boolean) {
    setEditStart(subtask.startedAt)
    setEditEnd(focusEnd ? nowHHMM() : '')
    setTimeError(null)
    focusEndRef.current = focusEnd
    setEditingCategory(false)
    resetCatPending()
    setEditingNote(false)
    setEditingTime(true)
  }

  function saveSubtaskTime() {
    if (editEnd && parseMinutes(editEnd) < parseMinutes(editStart)) {
      setTimeError(`Must be at or after ${editStart}`)
      return
    }
    if (editStart !== subtask.startedAt) {
      mutations.addSubtask.mutate({ date, periodId, subtask: { ...subtask, startedAt: editStart } })
    }
    if (editEnd) {
      mutations.stopLiveSubtask.mutate({ date, periodId, subtaskId: subtask.id, stoppedAt: editEnd })
    }
    setEditingTime(false)
  }

  function saveNote() {
    mutations.addSubtask.mutate({ date, periodId, subtask: { ...subtask, note: noteValue.trim() || undefined } })
    setEditingNote(false)
  }

  const isEditing = editingCategory || editingTime || editingNote

  return (
    <div
      data-testid="live-subtask-banner"
      aria-label="Edit subtask"
      className={`flex items-center gap-2 text-sm min-h-[2.625rem] mb-2 pb-2 border-b dark:border-gray-700 ${!isEditing ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (!isEditing) {
          resetCatPending()
          setEditingCategory(true)
        }
      }}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          resetCatPending()
          setEditingCategory(true)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="w-12 text-right font-mono text-sm tabular-nums shrink-0 flex items-center justify-end gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
        <span className="text-green-600 dark:text-green-400 font-semibold whitespace-nowrap">{elapsed}</span>
      </span>
      {editingCategory ? (
        <span className="relative flex items-center gap-2" onBlur={catHandleBlur} onFocus={catHandleFocus}>
          {catPendingCancel && <BlurCancelHint />}
          <CategoryPicker
            value={subtask.category}
            categories={categories}
            onChange={changeCategory}
            compact
            focusOnMount
            categoryDescriptions={categoryDescriptions}
          />
        </span>
      ) : (
        <>
          <span data-testid="live-subtask-category" className="font-medium text-gray-700 dark:text-gray-300 shrink-0">
            {subtask.category}
          </span>
          {description && <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">({description})</span>}
        </>
      )}
      {editingTime ? (
        <div
          className="relative flex items-center gap-1 flex-wrap shrink-0"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) saveSubtaskTime()
          }}
        >
          <input
            ref={subtaskStartInputRef}
            type="time"
            value={editStart}
            onChange={(e) => setEditStart(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveSubtaskTime()
              if (e.key === 'Escape') setEditingTime(false)
            }}
            aria-label="Edit subtask start time"
            className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            ref={subtaskEndInputRef}
            type="time"
            value={editEnd}
            onChange={(e) => {
              setEditEnd(e.target.value)
              setTimeError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveSubtaskTime()
              if (e.key === 'Escape') setEditingTime(false)
            }}
            aria-label="Edit subtask end time"
            className="rounded border px-1.5 py-0.5 text-sm w-24 font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
          {timeError && (
            <span className="absolute top-full left-0 mt-0.5 text-xs text-red-600 dark:text-red-400 whitespace-nowrap bg-white dark:bg-gray-800 rounded shadow px-1 z-10">
              {timeError}
            </span>
          )}
          <button
            type="button"
            onClick={saveSubtaskTime}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium ml-1"
          >
            Save
          </button>
          <button type="button" onClick={() => setEditingTime(false)} className="text-xs text-gray-400 ml-1">
            Cancel
          </button>
        </div>
      ) : (
        <span className="flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              enterSubtaskEditMode(false)
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400"
            aria-label={`Edit subtask start time ${subtask.startedAt}`}
          >
            {subtask.startedAt}
          </button>
          <span>–</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              enterSubtaskEditMode(true)
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400"
            aria-label="Edit subtask end time"
          >
            --:--
          </button>
        </span>
      )}
      {editingNote ? (
        <input
          ref={noteInputRef}
          type="text"
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveNote()
            if (e.key === 'Escape') setEditingNote(false)
          }}
          onBlur={saveNote}
          aria-label="Subtask note"
          className="text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 flex-1 min-w-0"
        />
      ) : subtask.note ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditingCategory(false)
            resetCatPending()
            setEditingTime(false)
            setEditingNote(true)
          }}
          className="text-sm text-gray-500 dark:text-gray-400 italic truncate flex-1 text-left hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {subtask.note}
        </button>
      ) : (
        <span className="flex-1" />
      )}
      {!editingTime && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              enterSubtaskEditMode(true)
            }}
            className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium border border-amber-200 dark:border-amber-800 rounded px-2 py-1 shrink-0"
          >
            Stop subtask
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmingDelete(true)
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-base leading-none shrink-0 p-1 rounded"
            aria-label="Delete live subtask"
          >
            ×
          </button>
        </>
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete subtask?"
          message={`Are you sure you want to delete the ${subtask.category} subtask?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            mutations.deleteSubtask.mutate({ date, periodId, subtaskId: subtask.id })
            setConfirmingDelete(false)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
