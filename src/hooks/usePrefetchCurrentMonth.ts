import { useQuery } from '@tanstack/react-query'
import { workPeriodRepo, timeEntryRepo, dayTypeOverrideRepo, dayConfirmationRepo, workLocationRepo } from '../repositories/shared'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'

/**
 * Warms the TanStack Query cache with the exact keys useMonthQuery uses for today's month.
 * Without this, MonthView and MonthGridView start with empty data until their own queries
 * resolve on mount — meaning the OvertimeBar shows stale/empty values until the view loads.
 */
export function usePrefetchCurrentMonth() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  const fromIso = toLocalIso(from)
  const toIso = toLocalIso(to)

  useQuery({
    queryKey: QUERY_KEYS.workWindowsByMonthTagged(year, month, 'month'),
    queryFn: () => workPeriodRepo.findByDateRange(from, to),
  })

  useQuery({
    queryKey: QUERY_KEYS.timeEntriesByMonthTagged(year, month, 'month'),
    queryFn: () => timeEntryRepo.findByDateRange(from, to),
  })

  useQuery({
    queryKey: QUERY_KEYS.dayTypeOverridesByMonth(year, month),
    queryFn: () => dayTypeOverrideRepo.findByDateRange(fromIso, toIso),
  })

  useQuery({
    queryKey: QUERY_KEYS.dayConfirmationsByMonth(year, month),
    queryFn: () => dayConfirmationRepo.findConfirmedInRange(fromIso, toIso),
  })

  useQuery({
    queryKey: QUERY_KEYS.workLocationsByMonth(year, month),
    queryFn: () => workLocationRepo.findByDateRange(fromIso, toIso),
  })
}
