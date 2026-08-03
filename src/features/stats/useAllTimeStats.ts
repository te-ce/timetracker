import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { useAppConfigState } from '../../shared/useAppConfig'
import { useTodayIso } from '../../shared/useTodayIso'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { useClock } from '../../shared/useClock'
import { hasLiveActivity } from '../../shared/dayBalance'
import { nowHHMM } from '../../shared/worktime'
import { buildAllTimeStats, type AllTimeStats, type StatsMonth } from './allTimeStats'
import type { MonthRepository } from '../../infra/repositories/types'

/** Every stored month, loaded in one go — the Stats view is all-time by nature. */
export async function loadAllMonths(monthRepo: MonthRepository): Promise<StatsMonth[]> {
  const yms = await monthRepo.getAllMonths()
  return Promise.all(
    yms.map(async (ym) => ({
      ym,
      data: await monthRepo.getMonth(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7))),
    })),
  )
}

export interface UseAllTimeStatsResult {
  stats: AllTimeStats
  isPending: boolean
}

export function useAllTimeStats(): UseAllTimeStatsResult {
  const { monthRepo } = useRepositories()
  const todayIso = useTodayIso()
  const { config, isPending: isConfigPending } = useAppConfigState()

  const monthsQuery = useQuery({
    queryKey: QUERY_KEYS.allMonthsData,
    queryFn: () => loadAllMonths(monthRepo),
  })
  const months = monthsQuery.data ?? []

  const todayWindows = months.find((m) => m.ym === todayIso.slice(0, 7))?.data[todayIso]?.windows ?? []
  const now = useClock(hasLiveActivity(todayWindows, nowHHMM()))

  return {
    stats: buildAllTimeStats({
      months,
      weekdayHours: config.weekdayHours,
      today: todayIso,
      now,
    }),
    isPending: monthsQuery.isPending || isConfigPending,
  }
}
