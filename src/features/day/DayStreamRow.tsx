import { SegmentTrailingActions } from './SegmentTrailingActions'
import type { WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { type TimeFormat } from '../../shared/timeFormatStore'
import type { ActiveTracking, DayOptions, DayStreamItem } from './dayStreamModel'
import type { DayBreak } from './dayBreaks'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { PeriodBoundaryRow } from './PeriodBoundaryRow'
import { SegmentRow } from './SegmentRow'
import { BreakRow } from './BreakRow'
import { derivePeriodWarnings } from './daySegments'
import { findSubtaskOverlaps, type OverlapFix } from './overlapRepair'
import { OverlapRepairBar } from './OverlapRepairBar'

export interface DayStreamRowProps {
  item: DayStreamItem
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
  mutations: ReturnType<typeof useWorkPeriodMutations>
  active: ActiveTracking | undefined
  now: string
  dayOptions: DayOptions
  timeFormat: TimeFormat
  editingTimesFor: string | null
  onStartEditingTimes: (periodId: string) => void
  onStopEditingTimes: () => void
  onSaveTimes: (period: WorkPeriod, start: string, end: string | null) => void
  onChangeCategory: (periodId: string, category: string) => void
  onDeletePeriod: (period: WorkPeriod) => void
  onDeleteSubtask: (periodId: string, subtask: WorkPeriodSubtask) => void
  onFillBreak: (dayBreak: DayBreak) => void
  loggingFor: string | null
  onStartLogging: (periodId: string) => void
  onStopLogging: () => void
  onAddSubtask: (periodId: string, subtask: WorkPeriodSubtask) => void
  onFixOverlap: (period: WorkPeriod, fix: OverlapFix) => void
}

export function DayStreamRow({
  item,
  date,
  categories,
  categoryDescriptions,
  preferCategoryDescriptionAsPrimary,
  mutations,
  active,
  now,
  dayOptions,
  timeFormat,
  editingTimesFor,
  onStartEditingTimes,
  onStopEditingTimes,
  onSaveTimes,
  onChangeCategory,
  onDeletePeriod,
  onDeleteSubtask,
  onFillBreak,
  loggingFor,
  onStartLogging,
  onStopLogging,
  onAddSubtask,
  onFixOverlap,
}: DayStreamRowProps) {
  if (item.type === 'period') {
    return (
      <PeriodBoundaryRow
        period={item.period}
        ordinal={item.ordinal}
        duration={item.duration}
        running={active?.period.id === item.period.id}
        categories={categories}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
        editing={editingTimesFor === item.period.id}
        onStartEditing={() => onStartEditingTimes(item.period.id)}
        onStopEditing={onStopEditingTimes}
        onSaveTimes={(start, end) => onSaveTimes(item.period, start, end)}
        onChangeCategory={(category) => onChangeCategory(item.period.id, category)}
        onDelete={() => onDeletePeriod(item.period)}
      />
    )
  }

  if (item.type === 'break') {
    return <BreakRow dayBreak={item.break} onFill={() => onFillBreak(item.break)} />
  }

  const { segment } = item
  const warnings = derivePeriodWarnings(item.period, now, dayOptions)
  // The bar hangs off the later subtask of each pair, where the eye already is.
  const repairs = findSubtaskOverlaps(item.period).filter((o) => o.later.id === segment.subtask?.id)
  const repairBars = repairs.length
    ? repairs.map((overlap) => (
        <OverlapRepairBar
          key={overlap.earlier.id}
          overlap={overlap}
          categoryDescriptions={categoryDescriptions}
          preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
          onApply={(fix) => onFixOverlap(item.period, fix)}
        />
      ))
    : undefined
  return (
    <SegmentRow
      segment={segment}
      date={date}
      categories={categories}
      categoryDescriptions={categoryDescriptions}
      preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
      mutations={mutations}
      overlaps={!!segment.subtask && warnings.overlappingSubtaskIds.includes(segment.subtask.id)}
      onDeleteSubtask={() => segment.subtask && onDeleteSubtask(segment.periodId, segment.subtask)}
      onEditPeriodTimes={() => onStartEditingTimes(item.period.id)}
      repair={repairBars}
      trailing={
        item.last ? (
          <SegmentTrailingActions
            periodId={item.period.id}
            overbookedBy={warnings.overbookedBy}
            timeFormat={timeFormat}
            loggingFor={loggingFor}
            categories={categories}
            categoryDescriptions={categoryDescriptions}
            preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
            onAddSubtask={(subtask) => onAddSubtask(item.period.id, subtask)}
            onStartLogging={() => onStartLogging(item.period.id)}
            onStopLogging={onStopLogging}
          />
        ) : undefined
      }
    />
  )
}
