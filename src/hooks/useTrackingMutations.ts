import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, TimeTrackingRepository, TimeEntry } from '../repositories/types'
import { mergeAdjacentInto } from '../domain/workPeriodMerge'
import { QUERY_KEYS, invalidateMonth } from './queryKeys'

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function saveStoppedEntry(
  stoppedDate: string,
  stoppedCategory: string,
  stoppedHours: number,
  repository: MonthRepository,
): Promise<void> {
  const year = parseInt(stoppedDate.slice(0, 4))
  const month = parseInt(stoppedDate.slice(5, 7))
  const monthData = await repository.getMonth(year, month)
  const existing = monthData[stoppedDate]?.entries.find((e) => e.category === stoppedCategory)
  await repository.updateDay(stoppedDate, (day) => {
    const updated: TimeEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      category: stoppedCategory,
      hours: Math.round(((existing?.hours ?? 0) + stoppedHours) * 100) / 100,
    }
    return { ...day, entries: [...day.entries.filter((e) => e.id !== updated.id), updated] }
  })
}

async function openWorkPeriod(date: string, repository: MonthRepository): Promise<void> {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  const monthData = await repository.getMonth(year, month)
  const dayWindows = monthData[date]?.windows ?? []
  if (dayWindows.some((w) => w.end === null)) return
  await repository.updateDay(date, (day) => ({
    ...day,
    windows: [...day.windows, { id: crypto.randomUUID(), start: nowHHMM(), end: null }],
  }))
}

async function closeLatestOpenWorkPeriod(date: string, repository: MonthRepository): Promise<void> {
  const year = parseInt(date.slice(0, 4))
  const month = parseInt(date.slice(5, 7))
  const monthData = await repository.getMonth(year, month)
  const dayWindows = monthData[date]?.windows ?? []
  const open = dayWindows.filter((w) => w.end === null)
  if (open.length === 0) return
  const latest = open.reduce((a, b) => (a.start > b.start ? a : b))
  const closed = { ...latest, end: nowHHMM() }
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
        await saveStoppedEntry(stopped.date, stopped.category, stopped.hours, repository)
        invalidateMonth(queryClient, stopped.date)
      }
      await trackingRepository.start(date, category)
      await openWorkPeriod(date, repository)
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
      if (stopped && stopped.hours > 0) {
        await saveStoppedEntry(stopped.date, stopped.category, stopped.hours, repository)
        invalidateMonth(queryClient, stopped.date)
      }
      if (active) await closeLatestOpenWorkPeriod(active.date, repository)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeTracking })
    },
  })

  return { start, stop }
}
