import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, TimeTrackingRepository } from '../../infra/repositories/types'
import { QUERY_KEYS, invalidateMonth } from '../../shared/queryKeys'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function useTrackingMutations(
  date: string,
  repository: MonthRepository,
  trackingRepository: TimeTrackingRepository,
) {
  const queryClient = useQueryClient()

  const start = useMutation({
    mutationFn: async (category: string) => {
      const stopped = await trackingRepository.stop()
      if (stopped && stopped.hours > 0) {
        await repository.closeOpenWorkPeriod(stopped.date, stopped.category, nowHHMM())
        invalidateMonth(queryClient, stopped.date)
      }
      await trackingRepository.start(date, category)
      await repository.openWorkPeriod(date, category, nowHHMM())
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
      invalidateMonth(queryClient, date)
    },
  })

  const stop = useMutation({
    mutationFn: async () => {
      const active = await trackingRepository.getActive()
      const stopped = await trackingRepository.stop()
      if (stopped && stopped.hours > 0 && active) {
        await repository.closeOpenWorkPeriod(active.date, active.category, nowHHMM())
        invalidateMonth(queryClient, active.date)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
    },
  })

  return { start, stop }
}
