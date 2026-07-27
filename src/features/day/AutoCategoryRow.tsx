import { useState } from 'react'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { CategoryPicker } from './CategoryPicker'
import { useBlurWarning, BlurCancelHint } from './workPeriodShared'

interface AutoCategoryRowProps {
  hours: number
  isRunning: boolean
  hasLiveSubtask: boolean
  category: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  periodId: string
  date: string
  mutations: ReturnType<typeof useWorkPeriodMutations>
  index: number
}

export function AutoCategoryRow({
  hours,
  isRunning,
  hasLiveSubtask,
  category,
  categories,
  categoryDescriptions,
  periodId,
  date,
  mutations,
  index,
}: AutoCategoryRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const stripeBg = index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50 rounded -mx-2 px-2' : ''
  const [editing, setEditing] = useState(false)
  const description = categoryDescriptions?.[category]
  const { pendingCancel, handleBlur, handleFocus, reset, cancelToken } = useBlurWarning(false)

  const [seenCancelToken, setSeenCancelToken] = useState(cancelToken)
  if (cancelToken !== seenCancelToken) {
    setSeenCancelToken(cancelToken)
    setEditing(false)
  }

  function handleChange(cat: string) {
    mutations.setPeriodCategory.mutate({ date, periodId, category: cat })
    setEditing(false)
    reset()
  }

  return (
    <div
      data-testid="auto-category-row"
      aria-label="Edit category"
      className={`relative grid grid-cols-[3rem_minmax(7rem,1fr)_auto] items-center gap-2 text-sm py-1.5 min-h-[2.625rem] ${stripeBg} ${!editing ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded' : ''}`}
      onClick={() => {
        if (!editing) {
          reset()
          setEditing(true)
        }
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === 'Enter' || e.key === ' ')) {
          reset()
          setEditing(true)
        }
      }}
      role="button"
      tabIndex={0}
      onBlur={(e) => {
        if (editing) handleBlur(e)
      }}
      onFocus={() => {
        if (editing) handleFocus()
      }}
    >
      {pendingCancel && editing && <BlurCancelHint />}
      <span className="font-mono text-sm tabular-nums text-right flex items-center justify-end gap-1">
        {isRunning && !hasLiveSubtask && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />}
        <span
          className={
            isRunning ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-500 dark:text-gray-400'
          }
        >
          {formatHours(hours, timeFormat)}
        </span>
      </span>
      {editing ? (
        <CategoryPicker
          value={category}
          categories={categories}
          onChange={handleChange}
          compact
          focusOnMount
          categoryDescriptions={categoryDescriptions}
        />
      ) : (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-left truncate">
          {category}
          {description && <span className="text-gray-400 dark:text-gray-500"> ({description})</span>}
        </span>
      )}
      <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded px-1.5 py-0.5 font-medium shrink-0 select-none">
        main
      </span>
    </div>
  )
}
