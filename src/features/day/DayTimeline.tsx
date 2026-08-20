import type { PendingDelete } from './pendingDelete'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MonthData, MonthRepository, WorkPeriod } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'
import { pickCategoryWithMostHours } from '../../shared/autoCategory'
import { sumCategoryHoursAcrossMonths } from '../../shared/periodCategories'
import { loadAllMonths } from '../../shared/loadAllMonths'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { buildDayStream, deriveDayStats, findActiveTracking } from './dayStreamModel'
import type { DayBreak } from './dayBreaks'
import { mergeAdjacentInto } from '../../infra/repositories/work-period-merge'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { TrackingBar } from './TrackingBar'
import { DayTotalsPanel } from './DayTotalsPanel'
import { applyOverlapFix } from './overlapRepair'
import { hasLiveActivity } from '../../shared/dayBalance'
import type { DayBalance } from '../../shared/dayBalance'
import { nowHHMM } from '../../shared/worktime'
import { useClock } from '../../shared/useClock'
import { toLocalIso } from '../../shared/dateUtils'
import { DayStreamRow } from './DayStreamRow'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

interface DayTimelineProps {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[] | undefined
  categoryOrder?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined
  preferCategoryDescriptionAsPrimary?: boolean | undefined
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

export function DayTimeline(props: DayTimelineProps) {
  const {
    date,
    windows,
    repository,
    autoCategory,
    categoryOrder,
    categoryDescriptions,
    preferCategoryDescriptionAsPrimary,
    initialCategory,
    balance,
  } = props
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
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
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
              preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
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
              onFixOverlap={(period, fix) =>
                mutations.fixOverlap.mutate({ date, window: applyOverlapFix(period, fix) })
              }
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

        {showTotals && (
          <DayTotalsPanel
            stats={stats}
            categoryDescriptions={categoryDescriptions}
            preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
            balance={balance}
            isLoading={isBalanceLoading}
          />
        )}
      </div>

      <DeleteConfirmDialog
        deleting={deleting}
        categoryDescriptions={categoryDescriptions}
        preferCategoryDescriptionAsPrimary={preferCategoryDescriptionAsPrimary}
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
