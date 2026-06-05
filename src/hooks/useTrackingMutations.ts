import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, TimeTrackingRepository } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { QUERY_KEYS, invalidateMonth } from './queryKeys'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function openWorkPeriod(date: string, category: string, repository: MonthRepository): Promise<void> {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  const monthData = await repository.getMonth(year, month)
  const dayWindows = monthData[date]?.windows ?? []
  if (dayWindows.some((w) => w.end === null)) return
  await repository.updateDay(date, (day) => ({
    ...day,
    windows: [...day.windows, { id: crypto.randomUUID(), start: nowHHMM(), end: null, category, subtasks: [] }],
  }))
}

async function closeLatestOpenWorkPeriodWithCategory(
  date: string,
  category: string,
  repository: MonthRepository,
): Promise<void> {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  const monthData = await repository.getMonth(year, month)
  const dayWindows = monthData[date]?.windows ?? []
  const open = dayWindows.filter((w) => w.end === null)
  if (open.length === 0) return
  const latest = open.reduce((a, b) => (a.start > b.start ? a : b))
  const closed = { ...latest, end: nowHHMM(), category }
  const { merged, absorbed } = mergeAdjacentInto(dayWindows, closed)
  await repository.updateDay(date, (day) => ({
    ...day,
    windows: [...day.windows.filter((w) => w.id !== merged.id && !absorbed.includes(w.id)), merged],
  }))
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
        await closeLatestOpenWorkPeriodWithCategory(stopped.date, stopped.category, repository)
        invalidateMonth(queryClient, stopped.date)
      }
      await trackingRepository.start(date, category)
      await openWorkPeriod(date, category, repository)
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
        await closeLatestOpenWorkPeriodWithCategory(active.date, active.category, repository)
        invalidateMonth(queryClient, active.date)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
    },
  })

  return { start, stop }
}
