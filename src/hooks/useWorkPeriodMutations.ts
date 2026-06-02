import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'

export function useWorkPeriodMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, window }: { date: string; window: WorkPeriod }) =>
      repository.updateDay(date, (day) => {
        const filtered = day.windows.filter((w) => w.id !== window.id)
        return { ...day, windows: [...filtered, window] }
      }),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const remove = useMutation({
    mutationFn: ({ date, id }: { date: string; id: string }) =>
      repository.updateDay(date, (day) => ({
        ...day,
        windows: day.windows.filter((w) => w.id !== id),
      })),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const saveWithAbsorbed = useMutation({
    mutationFn: ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.updateDay(date, (day) => {
        const filtered = day.windows.filter((w) => w.id !== window.id && !absorbed.includes(w.id))
        return { ...day, windows: [...filtered, window] }
      }),
    onSuccess: (_, { date }) => invalidate(date),
  })

  return { save, remove, saveWithAbsorbed }
}
