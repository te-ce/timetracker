import { OvertimeBar } from './OvertimeBar'
import { WorkPeriodPanel } from './WorkPeriodPanel'
import type { WorkPeriod, MonthRepository } from '../repositories/types'

interface Props {
  date: string
  windows: WorkPeriod[]
  repository: MonthRepository
  autoCategory: string | null
  customCategories?: string[]
  categoryOrder?: string[]
  categoryDescriptions?: Record<string, string>
  sollstunden?: number
  priorOvertime?: number
  workedToday?: number
  activeTrackingStartedAt?: string | null
}

export function WorkOverview({
  date,
  windows,
  repository,
  autoCategory,
  customCategories,
  categoryOrder,
  categoryDescriptions,
  sollstunden,
  priorOvertime,
  workedToday,
  activeTrackingStartedAt,
}: Props) {
  const liveWindowStart = windows.find((w) => w.end === null)?.start ?? null

  return (
    <div className="flex flex-col gap-4">
      {sollstunden !== undefined && priorOvertime !== undefined && workedToday !== undefined && (
        <OvertimeBar
          sollstunden={sollstunden}
          priorOvertime={priorOvertime}
          workedToday={workedToday}
          activeTrackingStartedAt={activeTrackingStartedAt}
          liveWindowStart={liveWindowStart}
        />
      )}
      <WorkPeriodPanel
        date={date}
        windows={windows}
        repository={repository}
        autoCategory={autoCategory}
        customCategories={customCategories}
        categoryOrder={categoryOrder}
        categoryDescriptions={categoryDescriptions}
      />
    </div>
  )
}
