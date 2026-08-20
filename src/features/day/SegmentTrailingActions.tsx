import type { WorkPeriodSubtask } from '../../infra/repositories/types'
import { formatHours } from '../../shared/formatHours'
import { type TimeFormat } from '../../shared/timeFormatStore'
import { SubtaskForm } from './SubtaskForm'

export interface SegmentTrailingActionsProps {
  periodId: string
  overbookedBy: number
  timeFormat: TimeFormat
  loggingFor: string | null
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onAddSubtask: (subtask: WorkPeriodSubtask) => void
  onStartLogging: () => void
  onStopLogging: () => void
}

export function SegmentTrailingActions({
  periodId,
  overbookedBy,
  timeFormat,
  loggingFor,
  categories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onAddSubtask,
  onStartLogging,
  onStopLogging,
}: SegmentTrailingActionsProps) {
  return (
    <>
      {overbookedBy > 0 && (
        <span className="font-medium text-red-600 dark:text-red-400">
          Subtasks exceed this work period by {formatHours(overbookedBy, timeFormat)}.
        </span>
      )}
      {loggingFor === periodId ? (
        <SubtaskForm
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
          onAdd={onAddSubtask}
          onCancel={onStopLogging}
        />
      ) : (
        <button
          type="button"
          onClick={onStartLogging}
          className="text-gray-500 underline decoration-dotted hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
        >
          + Log untracked subtask
        </button>
      )}
    </>
  )
}
