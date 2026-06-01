import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, MonthRepository } from '../repositories/types'
import { QUERY_KEYS } from './queryKeys'

export function useWorkPeriodMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    const year = parseInt(date.slice(0, 4))
    const month = parseInt(date.slice(5, 7))
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
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
