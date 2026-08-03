import { useState } from 'react'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { SubtaskEditForm } from './SubtaskEditForm'
import { categoryLabel } from './categoryLabel'
import type { DaySegment } from './daySegments'
import type { useWorkPeriodMutations } from './useWorkPeriodMutations'

interface SegmentRowProps {
  segment: DaySegment
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  mutations: ReturnType<typeof useWorkPeriodMutations>
  overlaps: boolean
  onDeleteSubtask: () => void
  /** Per-period actions, rendered on the period's last segment. */
  trailing?: React.ReactNode
}

/** One stretch of the day: the period's own category, or a subtask inside it. */
export function SegmentRow({
  segment,
  date,
  categories,
  categoryDescriptions,
  mutations,
  overlaps,
  onDeleteSubtask,
  trailing,
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
          stripeBg=""
          mutations={mutations}
          onDone={() => setEditing(false)}
        />
      </li>
    )
  }

  const kindLabel = segment.kind === 'main' ? 'main' : segment.placed ? 'subtask' : 'retro'

  return (
    <li
      aria-label={`${categoryLabel(segment.category)} ${formatHours(segment.hours, timeFormat)} ${kindLabel}`}
      className={`flex flex-wrap items-center gap-3 py-1 text-sm ${
        segment.live ? 'rounded bg-emerald-50 dark:bg-emerald-950/30' : ''
      }`}
    >
      <span className="flex w-4 shrink-0 justify-center self-stretch" aria-hidden="true">
        <span className={`w-1 rounded-full ${segment.live ? 'bg-emerald-400' : 'bg-indigo-200 dark:bg-indigo-900'}`} />
      </span>
      <span
        className={`w-24 shrink-0 font-mono text-xs tabular-nums ${
          overlaps ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {segment.placed ? `${segment.start}–${segment.end ?? 'now'}` : '· · · ·'}
      </span>
      <span
        className={`w-14 shrink-0 text-right font-mono text-sm tabular-nums ${
          segment.live ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {formatHours(segment.hours, timeFormat)}
      </span>
      {subtask ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${categoryLabel(segment.category)} subtask`}
          className="truncate text-left hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {categoryLabel(segment.category)}
          {segment.note && <span className="ml-2 text-xs italic text-gray-500 dark:text-gray-400">{segment.note}</span>}
        </button>
      ) : (
        <span className="truncate">{categoryLabel(segment.category)}</span>
      )}
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">{kindLabel}</span>
      {subtask && !segment.live && (
        <button
          type="button"
          onClick={onDeleteSubtask}
          aria-label={`Remove ${categoryLabel(segment.category)} subtask`}
          className="px-1 text-gray-400 hover:text-red-500 dark:text-gray-500"
        >
          ×
        </button>
      )}
      {trailing && <span className="ml-auto flex items-center gap-3 text-xs">{trailing}</span>}
    </li>
  )
}
