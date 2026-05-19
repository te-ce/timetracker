import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DayTypeOverride, DayTypeOverrideRepository } from '../repositories/types'

export function useDayTypeOverrideMutations(repository: DayTypeOverrideRepository) {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['dayTypeOverride'] })
    void queryClient.invalidateQueries({ queryKey: ['dayTypeOverrides'] })
  }

  const save = useMutation({
    mutationFn: ({ date, dayType }: { date: string; dayType: DayTypeOverride }) =>
      repository.save(date, dayType),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (date: string) => repository.delete(date),
    onSuccess: invalidate,
  })

  return { save, remove }
}
