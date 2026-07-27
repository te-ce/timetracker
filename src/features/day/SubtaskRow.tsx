import { useState } from 'react'
import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { SubtaskEditForm } from './SubtaskEditForm'
import { isTimedSubtask } from './workPeriodShared'

interface SubtaskRowProps {
  sl: WorkPeriodSubtask
  index: number
  periodId: string
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
  overlaps?: boolean
}

export function SubtaskRow({
  sl,
  index,
  periodId,
  date,
  categories,
  mutations,
  categoryDescriptions,
  overlaps,
}: SubtaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const timed = isTimedSubtask(sl)
  const stripeBg = index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/50 rounded -mx-2 px-2' : ''
  const timeFormat = useTimeFormatStore((s) => s.format)

  if (editing) {
    return (
      <SubtaskEditForm
        sl={sl}
        periodId={periodId}
        date={date}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        stripeBg={stripeBg}
        mutations={mutations}
        onDone={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      data-testid="subtask-row"
      aria-label={`Edit ${sl.category} subtask`}
      className={`flex items-center gap-2 text-sm group/slice min-h-[2.625rem] ${stripeBg} cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded`}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') setEditing(true)
      }}
      role="button"
      tabIndex={0}
    >
      <span className="w-12 text-right font-mono text-sm text-gray-500 dark:text-gray-400 tabular-nums shrink-0 whitespace-nowrap">
        {formatHours(sl.hours, timeFormat)}
      </span>
      <span className="font-medium text-gray-700 dark:text-gray-300 shrink-0">{sl.category}</span>
      {categoryDescriptions?.[sl.category] && (
        <span className="text-sm text-gray-400 dark:text-gray-500 shrink-0">({categoryDescriptions[sl.category]})</span>
      )}
      {timed && (
        <span
          className={`text-sm tabular-nums whitespace-nowrap shrink-0 ${overlaps ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}
          title={overlaps ? 'Overlaps with another subtask' : undefined}
        >
          {sl.startedAt} – {sl.stoppedAt}
        </span>
      )}
      {sl.note ? (
        <span className="text-sm text-gray-500 dark:text-gray-400 italic truncate flex-1">{sl.note}</span>
      ) : (
        <span className="flex-1" />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setConfirmingDelete(true)
        }}
        className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-base leading-none shrink-0 p-1 rounded"
        aria-label={`Remove ${sl.category} subtask`}
      >
        ×
      </button>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete subtask?"
          message={`Are you sure you want to delete the ${sl.category} subtask?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            mutations.deleteSubtask.mutate({ date, periodId, subtaskId: sl.id })
            setConfirmingDelete(false)
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
