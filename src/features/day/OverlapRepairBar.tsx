import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { categoryDisplay } from './categoryLabel'
import type { OverlapFix, SubtaskOverlap } from './overlapRepair'
import { suggestOverlapFixes } from './overlapRepair'

interface OverlapRepairBarProps {
  overlap: SubtaskOverlap
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onApply: (fix: OverlapFix) => void
}

function fixLabel(fix: OverlapFix, earlierLabel: string, laterLabel: string): string {
  switch (fix.kind) {
    case 'trim-earlier':
      return `End ${earlierLabel} at ${fix.at}`
    case 'delay-later':
      return `Start ${laterLabel} at ${fix.at}`
    case 'split':
      return `Split at ${fix.at}`
    case 'untime-later':
      return `Log ${laterLabel} as duration only`
    case 'drop-later':
      return `Delete ${laterLabel}`
  }
}

/**
 * Sits under the later of two clashing subtasks: names the clash and offers the
 * writes that end it, each labelled with the exact time it will set.
 */
export function OverlapRepairBar({
  overlap,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  onApply,
}: OverlapRepairBarProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const label = (category: string) =>
    categoryDisplay(category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).primary
  const earlierLabel = label(overlap.earlier.category)
  const laterLabel = label(overlap.later.category)

  return (
    <div
      role="group"
      aria-label={`Overlap between ${earlierLabel} and ${laterLabel}`}
      className="mt-1 flex w-full basis-full flex-wrap items-center gap-2 rounded bg-red-50 px-2 py-1.5 dark:bg-red-950/40"
    >
      <span className="font-medium text-red-700 dark:text-red-300">
        Overlaps {earlierLabel} by {formatHours(overlap.hours, timeFormat)}.
      </span>
      {suggestOverlapFixes(overlap).map((fix) => (
        <button
          key={fix.kind}
          type="button"
          onClick={() => onApply(fix)}
          className="rounded border border-gray-300 bg-white px-2 py-0.5 hover:border-indigo-500 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-indigo-400 dark:hover:text-indigo-400"
        >
          {fixLabel(fix, earlierLabel, laterLabel)}
        </button>
      ))}
    </div>
  )
}
