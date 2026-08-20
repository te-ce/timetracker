import { categoryText } from './categoryText'
import type { DaySegment } from './daySegments'

export interface DeleteSubtaskButtonProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onDeleteSubtask: () => void
}

export function DeleteSubtaskButton({
  segment,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onDeleteSubtask,
}: DeleteSubtaskButtonProps) {
  if (!segment.subtask || segment.live) return null
  return (
    <button
      type="button"
      onClick={onDeleteSubtask}
      aria-label={`Remove ${categoryText(segment.category, categoryDescriptions, preferCategoryDescriptionAsPrimary)} subtask`}
      className="px-1 text-gray-400 hover:text-red-500 dark:text-gray-500"
    >
      ×
    </button>
  )
}

/** One stretch of the day: the period's own category, or a subtask inside it. */
