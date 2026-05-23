import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository } from '../repositories/types'
import { QUERY_KEYS } from './queryKeys'

export function useTimeEntryMutations(repository: TimeEntryRepository) {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })

  const save = useMutation({
    mutationFn: (entry: TimeEntry) => repository.save(entry),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: invalidate,
  })

  return { save, remove }
}
