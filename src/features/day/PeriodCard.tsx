import type { WorkPeriod } from '../../infra/repositories/types'
import { useWorkPeriodMutations } from './useWorkPeriodMutations'
import { calculateWorkedHours, isPlannedStop, parseMinutes } from '../../shared/worktime'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { CardHeader } from './CardHeader'
import { AutoCategoryRow } from './AutoCategoryRow'
import { SubtaskRow } from './SubtaskRow'
import { LiveSubtaskBanner } from './LiveSubtaskBanner'
import { PeriodCardFooter } from './PeriodCardFooter'
import { isLiveSubtask, isTimedSubtask } from './workPeriodShared'

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

  const isRunning = w.end === null
  const canStartLiveSubtask = w.end === null || isPlannedStop(w, nowTime)
  const liveSubtask = w.subtasks.find(isLiveSubtask)
  const completedSubtasks = w.subtasks.filter((s) => !isLiveSubtask(s))

  const duration = calculateWorkedHours([w], isRunning ? nowTime : undefined)
  const slicedHours = completedSubtasks.reduce((s, sl) => s + sl.hours, 0)
  const remainder = Math.max(0, duration - slicedHours)
  const overbooked = !isRunning && slicedHours > duration + 0.001

  const timedSubtasks = completedSubtasks.filter(isTimedSubtask)
  const overlappingIds = new Set<string>()
  timedSubtasks.forEach((a, i) => {
    timedSubtasks.slice(i + 1).forEach((b) => {
      const aStart = parseMinutes(a.startedAt)
      const aEnd = parseMinutes(a.stoppedAt)
      const bStart = parseMinutes(b.startedAt)
      const bEnd = parseMinutes(b.stoppedAt)
      if (aStart < bEnd && bStart < aEnd) {
        overlappingIds.add(a.id)
        overlappingIds.add(b.id)
      }
    })
  })
  const hasOverlap = overlappingIds.size > 0

  const liveElapsedHours = (() => {
    if (!liveSubtask) return 0
    const startMins = parseMinutes(liveSubtask.startedAt)
    const endMins = parseMinutes(nowTime)
    const diff = endMins - startMins
    // If now is slightly behind startedAt (race between nowTime tick and subtask creation),
    // treat as zero rather than wrapping around midnight.
    if (diff < 0 && diff > -5) return 0
    const adjusted = diff < 0 ? diff + 24 * 60 : diff
    return adjusted / 60
  })()
  const displayRemainder = Math.max(0, remainder - liveElapsedHours)

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
