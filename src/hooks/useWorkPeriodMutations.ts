import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, WorkPeriodRepository } from '../repositories/types'
import { QUERY_KEYS } from './queryKeys'

export function useWorkPeriodMutations(repository: WorkPeriodRepository) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workWindowsAll })

  const save = useMutation({
    mutationFn: (window: WorkPeriod) => repository.save(window),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: invalidate,
  })

  return { save, remove }
}
