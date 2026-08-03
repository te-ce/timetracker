import { useState } from 'react'
import type { MonthRepository, WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { UNCATEGORIZED_CATEGORY } from '../../infra/repositories/types'
import { getAllCategories } from '../../shared/categories'
import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { buildDayStream, deriveDayStats, findActiveTracking } from './dayStreamModel'
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
import { nowHHMM } from '../../shared/worktime'
import { useClock } from '../../shared/useClock'
import { toLocalIso } from '../../shared/dateUtils'
import { categoryLabel } from './categoryLabel'

type PendingDelete =
  | { kind: 'period'; period: WorkPeriod }
  | { kind: 'subtask'; periodId: string; subtask: WorkPeriodSubtask }

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
}

export function DayTimeline({
  date,
  windows,
  repository,
  autoCategory,
  customCategories = [],
  categoryOrder,
  categoryDescriptions,
  initialCategory,
  showTotals = true,
}: DayTimelineProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)
  const now = useClock(hasLiveActivity(windows, nowHHMM()))
  // Planned stops and live segments only make sense while looking at today.
  const dayOptions = { isToday: date === toLocalIso(new Date()) }
  const mutations = useWorkPeriodMutations(repository)
  const stream = buildDayStream(windows, now, dayOptions)
  const stats = deriveDayStats(windows, now, dayOptions)
  const active = findActiveTracking(windows, now, dayOptions)
  const categories = getAllCategories(customCategories, categoryOrder)
  const [loggingFor, setLoggingFor] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PendingDelete | null>(null)
  const [editingTimesFor, setEditingTimesFor] = useState<string | null>(null)
  const defaultCategory = initialCategory ?? autoCategory ?? UNCATEGORIZED_CATEGORY

  function addPeriod(start: string, end: string | null, category: string) {
    const incoming: WorkPeriod = { id: crypto.randomUUID(), start, end, category, subtasks: [] }
    const { merged, absorbed } = mergeAdjacentInto(windows, incoming)
    mutations.saveWithAbsorbed.mutate({ date, window: merged, absorbed })
  }

  function startTracking(category: string) {
    addPeriod(nowHHMM(), null, category)
  }

  /** Filling a break means the work never actually stopped, so it continues the earlier category. */
  function fillBreak(dayBreak: DayBreak) {
    const before = windows.find((w) => w.end === dayBreak.start)
    addPeriod(dayBreak.start, dayBreak.end, before?.category ?? defaultCategory)
  }

  function stopTracking() {
    if (!active) return
    const endTime = nowHHMM()
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
        onStartSubtask={(category) => {
          if (!active) return
          mutations.startLiveSubtask.mutate({
            date,
            periodId: active.period.id,
            subtask: { id: crypto.randomUUID(), category, hours: 0, startedAt: nowHHMM() },
          })
        }}
        onStopSubtask={() => {
          if (!active?.subtask) return
          mutations.stopLiveSubtask.mutate({
            date,
            periodId: active.period.id,
            subtaskId: active.subtask.id,
            stoppedAt: nowHHMM(),
          })
        }}
      />

      <div className="flex items-start gap-4">
        <ol aria-label="Day timeline" className="flex min-w-0 flex-1 flex-col">
          {stream.map((item) => {
            if (item.type === 'period') {
              return (
                <PeriodBoundaryRow
                  key={item.key}
                  period={item.period}
                  ordinal={item.ordinal}
                  duration={item.duration}
                  running={active?.period.id === item.period.id}
                  categories={categories}
                  categoryDescriptions={categoryDescriptions}
                  editing={editingTimesFor === item.period.id}
                  onStartEditing={() => setEditingTimesFor(item.period.id)}
                  onStopEditing={() => setEditingTimesFor(null)}
                  onSaveTimes={(start, end) =>
                    mutations.saveWithAbsorbed.mutate({
                      date,
                      window: { ...item.period, start, end },
                      absorbed: [],
                    })
                  }
                  onChangeCategory={(category) =>
                    mutations.setPeriodCategory.mutate({ date, periodId: item.period.id, category })
                  }
                  onDelete={() => setDeleting({ kind: 'period', period: item.period })}
                />
              )
            }

            if (item.type === 'break') {
              return <BreakRow key={item.key} dayBreak={item.break} onFill={() => fillBreak(item.break)} />
            }

            const { segment } = item
            const warnings = derivePeriodWarnings(item.period, now, dayOptions)
            return (
              <SegmentRow
                key={item.key}
                segment={segment}
                date={date}
                categories={categories}
                categoryDescriptions={categoryDescriptions}
                mutations={mutations}
                overlaps={!!segment.subtask && warnings.overlappingSubtaskIds.includes(segment.subtask.id)}
                onDeleteSubtask={() =>
                  segment.subtask &&
                  setDeleting({ kind: 'subtask', periodId: segment.periodId, subtask: segment.subtask })
                }
                onEditPeriodTimes={() => setEditingTimesFor(item.period.id)}
                trailing={
                  item.last ? (
                    <>
                      {warnings.overlappingSubtaskIds.length > 0 && (
                        <span className="font-medium text-red-600 dark:text-red-400">
                          Subtasks overlap in time — check their start and stop times.
                        </span>
                      )}
                      {warnings.overbookedBy > 0 && (
                        <span className="font-medium text-red-600 dark:text-red-400">
                          Subtasks exceed this work period by {formatHours(warnings.overbookedBy, timeFormat)}.
                        </span>
                      )}
                      {loggingFor === item.period.id ? (
                        <SubtaskForm
                          categories={categories}
                          categoryDescriptions={categoryDescriptions}
                          onAdd={(subtask) => {
                            mutations.addSubtask.mutate({ date, periodId: item.period.id, subtask })
                            setLoggingFor(null)
                          }}
                          onCancel={() => setLoggingFor(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setLoggingFor(item.period.id)}
                          className="text-gray-500 underline decoration-dotted hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                        >
                          + Log untracked subtask
                        </button>
                      )}
                    </>
                  ) : undefined
                }
              />
            )
          })}
        </ol>

        {showTotals && <DayTotalsPanel stats={stats} />}
      </div>

      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'period' ? 'Delete work period?' : 'Delete subtask?'}
          message={
            deleting.kind === 'period'
              ? `Delete the work period ${deleting.period.start} – ${deleting.period.end ?? 'now'}?`
              : `Delete the ${categoryLabel(deleting.subtask.category)} subtask?`
          }
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            if (deleting.kind === 'period') {
              mutations.remove.mutate({ date, id: deleting.period.id })
            } else {
              mutations.deleteSubtask.mutate({ date, periodId: deleting.periodId, subtaskId: deleting.subtask.id })
            }
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
