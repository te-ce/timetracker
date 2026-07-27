import type { WorkPeriod } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { CardHeader } from './CardHeader'
import { AutoCategoryRow } from './AutoCategoryRow'
import { SubtaskRow } from './SubtaskRow'
import { LiveSubtaskBanner } from './LiveSubtaskBanner'
import { PeriodCardFooter } from './PeriodCardFooter'
import { computePeriodCardModel } from './periodCardModel'

interface PeriodCardProps {
  w: WorkPeriod
  date: string
  categories: string[]
  mutations: ReturnType<typeof useWorkPeriodMutations>
  categoryDescriptions?: Record<string, string> | undefined
  nowTime: string
}

export function PeriodCard({ w, date, categories, mutations, categoryDescriptions, nowTime }: PeriodCardProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  const {
    isRunning,
    canStartLiveSubtask,
    liveSubtask,
    completedSubtasks,
    duration,
    overbooked,
    overlappingIds,
    hasOverlap,
    displayRemainder,
  } = computePeriodCardModel(w, nowTime)
  const slicedHours = completedSubtasks.reduce((s, sl) => s + sl.hours, 0)

  return (
    <div className="rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
      <CardHeader
        w={w}
        date={date}
        duration={duration}
        isRunning={isRunning}
        liveSubtask={liveSubtask}
        mutations={mutations}
      />

      <div className="px-4 py-3 flex flex-col gap-1.5">
        <AutoCategoryRow
          hours={displayRemainder}
          isRunning={isRunning}
          hasLiveSubtask={!!liveSubtask}
          category={w.category}
          categories={categories}
          categoryDescriptions={categoryDescriptions}
          periodId={w.id}
          date={date}
          mutations={mutations}
          index={0}
        />

        {completedSubtasks.map((sl, i) => (
          <SubtaskRow
            key={sl.id}
            sl={sl}
            index={i + 1}
            periodId={w.id}
            date={date}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
            overlaps={overlappingIds.has(sl.id)}
          />
        ))}

        {liveSubtask && (
          <LiveSubtaskBanner
            subtask={liveSubtask}
            periodId={w.id}
            date={date}
            nowTime={nowTime}
            categories={categories}
            mutations={mutations}
            categoryDescriptions={categoryDescriptions}
          />
        )}

        {hasOverlap && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Subtasks overlap in time — check start/stop times for conflicts.
          </p>
        )}

        {overbooked && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Subtasks exceed period by {formatHours(slicedHours - duration, timeFormat)} — reduce subtask hours or extend
            the period.
          </p>
        )}

        <PeriodCardFooter
          canStartLiveSubtask={canStartLiveSubtask}
          periodId={w.id}
          date={date}
          categories={categories}
          defaultCategory={w.category}
          mutations={mutations}
          categoryDescriptions={categoryDescriptions}
        />
      </div>
    </div>
  )
}
