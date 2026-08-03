import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { useTodayIso } from '../../shared/useTodayIso'
import { QUERY_KEYS } from '../../shared/queryKeys'
import {
  composeDayContext,
  type DayContext,
  type DayRawData,
  type DayConfigContext,
  type DayComputedStats,
} from './dayContext'
import { useAppConfig } from '../../shared/useAppConfig'
import { nowHHMM } from '../../shared/worktime'
import { loadOvertimeCarryOverBeforeMonth } from '../../shared/monthOvertime'
import type { ResolvedAppConfig } from '../../shared/appConfigDefaults'

export type { DayRawData, DayConfigContext, DayComputedStats, DayContext }

export interface DayQueryResult extends DayContext {
  config: ResolvedAppConfig
}

export function useDayQuery(date: string): DayQueryResult {
  const { monthRepo } = useRepositories()
  const todayIso = useTodayIso()
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))

  const config = useAppConfig()

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  const { data: priorMonthsOvertime = 0 } = useQuery({
    queryKey: QUERY_KEYS.overtimeCarryOver(year, month),
    queryFn: () => loadOvertimeCarryOverBeforeMonth(monthRepo, year, month, config.weekdayHours),
  })

  return {
    config,
    ...composeDayContext(date, monthData, config, todayIso, nowHHMM(), priorMonthsOvertime),
  }
}
