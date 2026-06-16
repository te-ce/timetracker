import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { toLocalIso } from '../../shared/dateUtils'
import { QUERY_KEYS } from '../../shared/queryKeys'
import {
  composeDayContext,
  type DayContext,
  type DayRawData,
  type DayConfigContext,
  type DayComputedStats,
} from './dayContext'
import type { AppConfig } from '../../infra/repositories/types'

export type { DayRawData, DayConfigContext, DayComputedStats, DayContext }

export interface DayQueryResult extends DayContext {
  config: AppConfig | undefined
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useDayQuery(date: string): DayQueryResult {
  const { monthRepo, configRepo } = useRepositories()
  const todayIso = toLocalIso(new Date())
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  return { config, ...composeDayContext(date, monthData, config, todayIso, nowHHMM()) }
}
