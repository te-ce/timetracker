import { categoryText } from './categoryText'
import type { DaySegment } from './daySegments'

export interface SegmentCategoryProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onEditSubtask: () => void
}

export function SegmentCategory({
  segment,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onEditSubtask,
}: SegmentCategoryProps) {
  const label = categoryText(segment.category, categoryDescriptions, preferCategoryDescriptionAsPrimary)
  if (!segment.subtask) return <span className="truncate">{label}</span>
  return (
    <button
      type="button"
      onClick={onEditSubtask}
      aria-label={`Edit ${label} subtask`}
      className="truncate text-left hover:text-indigo-600 dark:hover:text-indigo-400"
    >
      {label}
      {segment.note && <span className="ml-2 text-xs italic text-gray-500 dark:text-gray-400">{segment.note}</span>}
    </button>
  )
}
