import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { SubtaskEditForm } from './SubtaskEditForm'
import type { DaySegment } from './daySegments'
import type { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { SegmentHours } from './SegmentHours'
import { categoryText } from './categoryText'
import { SegmentCategory } from './SegmentCategory'
import { DeleteSubtaskButton } from './DeleteSubtaskButton'
import { TimeEditButton } from './TimeEditButton'

interface SegmentRowProps {
  segment: DaySegment
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  mutations: ReturnType<typeof useWorkPeriodMutations>
  overlaps: boolean
  onDeleteSubtask: () => void
  /** Clicking a main stretch's time edits the work period it belongs to. */
  onEditPeriodTimes: () => void
  /** Per-period actions, rendered on the period's last segment. */
  trailing?: React.ReactNode
  /** Overlap repair bars for this segment's subtask, on their own line below the row. */
  repair?: React.ReactNode
}

function segmentKindLabel(segment: DaySegment): string {
  if (segment.kind === 'main') return 'main'
  return segment.placed ? 'subtask' : 'retro'
}

export function SegmentRow({
  segment,
  date,
  categories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  mutations,
  overlaps,
  onDeleteSubtask,
  onEditPeriodTimes,
  trailing,
  repair,
}: SegmentRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const [editing, setEditing] = useState(false)
  const { subtask } = segment

  if (editing && subtask) {
    return (
      <li className="py-1 text-sm">
        <SubtaskEditForm
          sl={subtask}
          periodId={segment.periodId}
          date={date}
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
          stripeBg=""
          mutations={mutations}
          onDone={() => setEditing(false)}
        />
      </li>
    )
  }

  const kindLabel = segmentKindLabel(segment)

  return (
    <li
      aria-label={`${categoryText(segment.category, categoryDescriptions, preferCategoryDescriptionAsPrimary)} ${formatHours(segment.hours, timeFormat)} ${kindLabel}`}
      className={`flex flex-wrap items-center gap-3 py-1 text-sm ${
        segment.live ? 'rounded bg-emerald-50 dark:bg-emerald-950/30' : ''
      }`}
    >
      <span className="flex w-4 shrink-0 justify-center self-stretch" aria-hidden="true">
        <span className={`w-1 rounded-full ${segment.live ? 'bg-emerald-400' : 'bg-indigo-200 dark:bg-indigo-900'}`} />
      </span>
      <TimeEditButton
        segment={segment}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        overlaps={overlaps}
        onEditPeriodTimes={onEditPeriodTimes}
        onEditSubtask={() => setEditing(true)}
      />
      <SegmentHours segment={segment} />
      <SegmentCategory
        segment={segment}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onEditSubtask={() => setEditing(true)}
      />
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{kindLabel}</span>
      <DeleteSubtaskButton
        segment={segment}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        onDeleteSubtask={onDeleteSubtask}
      />
      {trailing && <span className="ml-auto flex items-center gap-3 text-xs">{trailing}</span>}
      {repair && <span className="w-full basis-full text-xs">{repair}</span>}
    </li>
  )
}
