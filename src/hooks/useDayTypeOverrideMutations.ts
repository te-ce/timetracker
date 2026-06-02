import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DayTypeOverride, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'

export function useDayTypeOverrideMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
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
