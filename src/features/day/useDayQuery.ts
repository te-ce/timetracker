import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { useTodayIso } from '../../shared/useTodayIso'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { composeDayContext, type DayContext } from './dayContext'
import { useAppConfigState } from '../../shared/useAppConfig'
import { nowHHMM } from '../../shared/worktime'
import { loadOvertimeCarryOverBeforeMonth } from '../../shared/monthOvertime'
import type { ResolvedAppConfig } from '../../shared/appConfigDefaults'

export interface DayQueryResult extends DayContext {
  config: ResolvedAppConfig
  /** False while the month or the prior-months overtime carry-over is still loading. */
  isOvertimeReady: boolean
}

export function useDayQuery(date: string): DayQueryResult {
  const { monthRepo } = useRepositories()
  const todayIso = useTodayIso()
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))

  const { config, isPending: isConfigPending } = useAppConfigState()

  const monthQuery = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })
  const monthData = monthQuery.data ?? {}

  const carryOverQuery = useQuery({
    queryKey: QUERY_KEYS.overtimeCarryOver(year, month),
    queryFn: () => loadOvertimeCarryOverBeforeMonth(monthRepo, year, month, config.weekdayHours),
    enabled: !isConfigPending,
  })
  const priorMonthsOvertime = carryOverQuery.data ?? 0

  return {
    config,
    isOvertimeReady: !monthQuery.isPending && !carryOverQuery.isPending,
    ...composeDayContext(date, monthData, config, todayIso, nowHHMM(), priorMonthsOvertime),
  }
}
