import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MonthData, MonthRepository, WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'
import { pickCategoryWithMostHours } from '../../shared/autoCategory'
import { sumCategoryHoursAcrossMonths } from '../../shared/periodCategories'
import { loadAllMonths } from '../../shared/loadAllMonths'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore, type TimeFormat } from '../../shared/timeFormatStore'
import { buildDayStream, deriveDayStats, findActiveTracking } from './dayStreamModel'
import type { ActiveTracking, DayOptions, DayStreamItem } from './dayStreamModel'
import type { DayBreak } from './dayBreaks'
import { mergeAdjacentInto } from '../../infra/repositories/work-period-merge'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { TrackingBar } from './TrackingBar'
import { PeriodBoundaryRow } from './PeriodBoundaryRow'
import { SegmentRow } from './SegmentRow'
import { BreakRow } from './BreakRow'
import { DayTotalsPanel } from './DayTotalsPanel'
import { derivePeriodWarnings } from './daySegments'
import { SubtaskForm } from './SubtaskForm'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { hasLiveActivity } from '../../shared/dayBalance'
import type { DayBalance } from '../../shared/dayBalance'
import { nowHHMM } from '../../shared/worktime'
import { useClock } from '../../shared/useClock'
import { toLocalIso } from '../../shared/dateUtils'
import { categoryLabel } from './categoryLabel'

type PendingDelete =
  { kind: 'period'; period: WorkPeriod } | { kind: 'subtask'; periodId: string; subtask: WorkPeriodSubtask }

interface DayTimelineProps {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined
  initialCategory?: string | undefined
  /** Off where the host is too narrow for it, e.g. the month table's day dialog. */
  showTotals?: boolean
  /** The required/overtime/remaining block in the totals panel, in place of a separate OvertimeBar. */
  balance?: DayBalance | undefined
  isBalanceLoading?: boolean | undefined
}

interface ResolvedDayTimelineOptions {
  customCategories: string[]
  showTotals: boolean
  isBalanceLoading: boolean
}

function resolveDayTimelineOptions(props: DayTimelineProps): ResolvedDayTimelineOptions {
  return {
    customCategories: props.customCategories ?? [],
    showTotals: props.showTotals ?? true,
    isBalanceLoading: props.isBalanceLoading ?? false,
  }
}

function shouldTickClock(isToday: boolean, windows: WorkPeriod[]): boolean {
  return isToday || hasLiveActivity(windows, nowHHMM())
}

function resolveDefaultCategory(
  allTimeMonthData: MonthData[],
  categories: string[],
  initialCategory: string | undefined,
  autoCategory: string | null,
): string {
  const allTimeCategoryHours = sumCategoryHoursAcrossMonths(allTimeMonthData)
  const mostBookedCategory = pickCategoryWithMostHours(allTimeCategoryHours, categories) ?? categories[0] ?? ''
  return initialCategory ?? autoCategory ?? mostBookedCategory
}

interface DeleteConfirmDialogProps {
  deleting: PendingDelete | null
  onConfirm: (deleting: PendingDelete) => void
  onCancel: () => void
}

function DeleteConfirmDialog({ deleting, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!deleting) return null
  const title = deleting.kind === 'period' ? 'Delete work period?' : 'Delete subtask?'
  const message =
    deleting.kind === 'period'
      ? `Delete the work period ${deleting.period.start} – ${deleting.period.end ?? 'now'}?`
      : `Delete the ${categoryLabel(deleting.subtask.category)} subtask?`
  return (
    <ConfirmDialog
      title={title}
      message={message}
      confirmLabel="Delete"
      danger
      onConfirm={() => onConfirm(deleting)}
      onCancel={onCancel}
    />
  )
}

interface SegmentTrailingActionsProps {
  periodId: string
  overlappingCount: number
  overbookedBy: number
  timeFormat: TimeFormat
  loggingFor: string | null
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
  onAddSubtask: (subtask: WorkPeriodSubtask) => void
  onStartLogging: () => void
  onStopLogging: () => void
}

function SegmentTrailingActions({
  periodId,
  overlappingCount,
  overbookedBy,
  timeFormat,
  loggingFor,
  categories,
  categoryDescriptions,
  onAddSubtask,
  onStartLogging,
  onStopLogging,
}: SegmentTrailingActionsProps) {
  return (
    <>
      {overlappingCount > 0 && (
        <span className="font-medium text-red-600 dark:text-red-400">
          Subtasks overlap in time — check their start and stop times.
        </span>
      )}
      {overbookedBy > 0 && (
        <span className="font-medium text-red-600 dark:text-red-400">
          Subtasks exceed this work period by {formatHours(overbookedBy, timeFormat)}.
        </span>
      )}
      {loggingFor === periodId ? (
        <SubtaskForm
          categories={categories}
          categoryDescriptions={categoryDescriptions}
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

interface DayStreamRowProps {
  item: DayStreamItem
  date: string
  categories: string[]
  categoryDescriptions?: Record<string, string> | undefined
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
}

function DayStreamRow({
  item,
  date,
  categories,
  categoryDescriptions,
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
  return (
    <SegmentRow
      segment={segment}
      date={date}
      categories={categories}
      categoryDescriptions={categoryDescriptions}
      mutations={mutations}
      overlaps={!!segment.subtask && warnings.overlappingSubtaskIds.includes(segment.subtask.id)}
      onDeleteSubtask={() => segment.subtask && onDeleteSubtask(segment.periodId, segment.subtask)}
      onEditPeriodTimes={() => onStartEditingTimes(item.period.id)}
      trailing={
        item.last ? (
          <SegmentTrailingActions
            periodId={item.period.id}
            overlappingCount={warnings.overlappingSubtaskIds.length}
            overbookedBy={warnings.overbookedBy}
            timeFormat={timeFormat}
            loggingFor={loggingFor}
            categories={categories}
            categoryDescriptions={categoryDescriptions}
            onAddSubtask={(subtask) => onAddSubtask(item.period.id, subtask)}
            onStartLogging={() => onStartLogging(item.period.id)}
            onStopLogging={onStopLogging}
          />
        ) : undefined
      }
    />
  )
}

export function DayTimeline(props: DayTimelineProps) {
  const { date, windows, repository, autoCategory, categoryOrder, categoryDescriptions, initialCategory, balance } =
    props
  const { customCategories, showTotals, isBalanceLoading } = resolveDayTimelineOptions(props)
  const timeFormat = useTimeFormatStore((s) => s.format)
  // Planned stops and live segments only make sense while looking at today.
  const dayOptions = { isToday: date === toLocalIso(new Date()) }
  // Keep ticking on today even with no open period, so "Start tracking at" stays current.
  const now = useClock(shouldTickClock(dayOptions.isToday, windows))
  const mutations = useWorkPeriodMutations(repository)
  const stream = buildDayStream(windows, now, dayOptions)
  const stats = deriveDayStats(windows, now, dayOptions)
  const active = findActiveTracking(windows, now, dayOptions)
  const categories = getAllCategories(customCategories, categoryOrder)
  const [loggingFor, setLoggingFor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PendingDelete | null>(null)
  const [editingTimesFor, setEditingTimesFor] = useState<string | null>(null)
  const allMonthsQuery = useQuery({ queryKey: QUERY_KEYS.allMonthsData, queryFn: () => loadAllMonths(repository) })
  const allTimeMonthData = (allMonthsQuery.data ?? []).map((m) => m.data)
  const defaultCategory = resolveDefaultCategory(allTimeMonthData, categories, initialCategory, autoCategory)

  function addPeriod(start: string, end: string | null, category: string) {
    const incoming: WorkPeriod = { id: crypto.randomUUID(), start, end, category, subtasks: [] }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    mutations.saveWithAbsorbed.mutate({ date, window: merged, absorbed })
  }

  function startTracking(category: string, startTime: string) {
    addPeriod(startTime, null, category)
  }

  /** Filling a break means the work never actually stopped, so it continues the earlier category. */
  function fillBreak(dayBreak: DayBreak) {
    const before = windows.find((w) => w.end === dayBreak.start)
    addPeriod(dayBreak.start, dayBreak.end, before?.category ?? defaultCategory)
  }

  function stopTracking(endTime: string) {
    if (!active) return
    mutations.stopPeriod.mutate({
      date,
      periodId: active.period.id,
      endTime,
      liveSubtaskId: active.subtask?.id,
      stoppedAt: active.subtask ? endTime : undefined,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <TrackingBar
        active={active}
        now={now}
        categories={categories}
        defaultCategory={defaultCategory}
        categoryDescriptions={categoryDescriptions}
        isToday={dayOptions.isToday}
        onStart={startTracking}
        onAddPeriod={(start, end, category) => addPeriod(start, end, category)}
        onStop={stopTracking}
        onStartSubtask={(category, startTime) => {
          if (!active) return
          mutations.startLiveSubtask.mutate({
            date,
            periodId: active.period.id,
            subtask: { id: crypto.randomUUID(), category, hours: 0, startedAt: startTime },
          })
        }}
        onStopSubtask={(stoppedAt) => {
          if (!active?.subtask) return
          mutations.stopLiveSubtask.mutate({
            date,
            periodId: active.period.id,
            subtaskId: active.subtask.id,
            stoppedAt,
          })
        }}
      />

      <div className="flex items-start gap-4">
        <ol aria-label="Day timeline" className="flex min-w-0 flex-1 flex-col">
          {stream.map((item) => (
            <DayStreamRow
              key={item.key}
              item={item}
              date={date}
              categories={categories}
              categoryDescriptions={categoryDescriptions}
              mutations={mutations}
              active={active}
              now={now}
              dayOptions={dayOptions}
              timeFormat={timeFormat}
              editingTimesFor={editingTimesFor}
              onStartEditingTimes={(periodId) => setEditingTimesFor(periodId)}
              onStopEditingTimes={() => setEditingTimesFor(null)}
              onSaveTimes={(period, start, end) =>
                mutations.saveWithAbsorbed.mutate({ date, window: { ...period, start, end }, absorbed: [] })
              }
              onChangeCategory={(periodId, category) =>
                mutations.setPeriodCategory.mutate({ date, periodId, category })
              }
              onDeletePeriod={(period) => setDeleting({ kind: 'period', period })}
              onDeleteSubtask={(periodId, subtask) => setDeleting({ kind: 'subtask', periodId, subtask })}
              onFillBreak={fillBreak}
              loggingFor={loggingFor}
              onStartLogging={(periodId) => setLoggingFor(periodId)}
              onStopLogging={() => setLoggingFor(null)}
              onAddSubtask={(periodId, subtask) => {
                mutations.addSubtask.mutate({ date, periodId, subtask })
                setLoggingFor(null)
              }}
            />
          ))}
        </ol>

        {showTotals && <DayTotalsPanel stats={stats} balance={balance} isLoading={isBalanceLoading} />}
      </div>

      <DeleteConfirmDialog
        deleting={deleting}
        onConfirm={(pending) => {
          if (pending.kind === 'period') {
            mutations.remove.mutate({ date, id: pending.period.id })
          } else {
            mutations.deleteSubtask.mutate({ date, periodId: pending.periodId, subtaskId: pending.subtask.id })
          }
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
