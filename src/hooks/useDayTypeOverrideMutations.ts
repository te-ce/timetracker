import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DayTypeOverride, MonthRepository } from '../repositories/types'
import { QUERY_KEYS } from './queryKeys'

export function useDayTypeOverrideMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    const year = parseInt(date.slice(0, 4))
    const month = parseInt(date.slice(5, 7))
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.month(year, month) })
  }

  const save = useMutation({
    mutationFn: ({ date, dayType }: { date: string; dayType: DayTypeOverride }) =>
      repository.updateDay(date, (day) => ({ ...day, dayTypeOverride: dayType })),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const remove = useMutation({
    mutationFn: (date: string) =>
      repository.updateDay(date, (day) => {
        const updated = { ...day }
        delete updated.dayTypeOverride
        return updated
      }),
    onSuccess: (_, date) => invalidate(date),
  })

  return { save, remove }
}
