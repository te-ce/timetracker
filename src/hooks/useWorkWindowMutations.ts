import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkWindow, WorkWindowRepository } from '../repositories/types'

export function useWorkWindowMutations(repository: WorkWindowRepository) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['workWindows'] })

  const save = useMutation({
    mutationFn: (window: WorkWindow) => repository.save(window),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: invalidate,
  })

  return { save, remove }
}
