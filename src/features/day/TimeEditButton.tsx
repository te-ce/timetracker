import { categoryText } from './categoryText'
import type { DaySegment } from './daySegments'

export interface TimeEditButtonProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  overlaps: boolean
  onEditPeriodTimes: () => void
  onEditSubtask: () => void
}

export function TimeEditButton({
  segment,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  overlaps,
  onEditPeriodTimes,
  onEditSubtask,
}: TimeEditButtonProps) {
  return (
    <button
      type="button"
      onClick={segment.subtask ? onEditSubtask : onEditPeriodTimes}
      aria-label={timeEditLabel(segment, categoryDescriptions, preferCategoryDescriptionAsPrimary)}
      className={`w-24 shrink-0 text-left font-mono text-xs tabular-nums hover:text-indigo-600 dark:hover:text-indigo-400 ${
        overlaps ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      {segment.placed ? `${segment.start}–${segment.end ?? 'now'}` : '· · · ·'}
    </button>
  )
}

function timeEditLabel(
  segment: DaySegment,
  categoryDescriptions: Record<string, string> | undefined,
  preferCategoryDescriptionAsPrimary: boolean | undefined,
): string {
  const category = categoryText(segment.category, categoryDescriptions, preferCategoryDescriptionAsPrimary)
  if (!segment.subtask) return `Edit work period times ${segment.start}–${segment.end ?? 'now'}`
  return segment.placed ? `Edit ${category} subtask times` : `Edit ${category} subtask duration`
}
