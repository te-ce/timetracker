import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { SubtaskEditForm } from './SubtaskEditForm'
import { categoryDisplay } from './categoryLabel'
import type { DaySegment } from './daySegments'
import type { useWorkPeriodMutations } from './useWorkPeriodMutations'

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

function categoryText(
  category: string,
  categoryDescriptions: Record<string, string> | undefined,
  preferCategoryDescriptionAsPrimary: boolean | undefined,
): string {
  return categoryDisplay(category, categoryDescriptions ?? {}, preferCategoryDescriptionAsPrimary ?? false).primary
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

function segmentKindLabel(segment: DaySegment): string {
  if (segment.kind === 'main') return 'main'
  return segment.placed ? 'subtask' : 'retro'
}

interface TimeEditButtonProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  overlaps: boolean
  onEditPeriodTimes: () => void
  onEditSubtask: () => void
}

function TimeEditButton({
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

interface SegmentHoursProps {
  segment: DaySegment
}

function SegmentHours({ segment }: SegmentHoursProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  return (
    <span
      className={`w-14 shrink-0 text-right font-mono text-sm tabular-nums ${
        segment.live ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
      }`}
    >
      {formatHours(segment.hours, timeFormat)}
    </span>
  )
}

interface SegmentCategoryProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onEditSubtask: () => void
}

function SegmentCategory({
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

interface DeleteSubtaskButtonProps {
  segment: DaySegment
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  onDeleteSubtask: () => void
}

function DeleteSubtaskButton({
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
