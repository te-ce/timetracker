import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, TimeEntryRepository } from '../repositories/types'
import { QUERY_KEYS } from './queryKeys'
import { useUndoStore } from '../stores/undoStore'

export function useTimeEntryMutations(repository: TimeEntryRepository) {
  const queryClient = useQueryClient()
  const push = useUndoStore((s) => s.push)
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.timeEntriesAll })

  const save = useMutation({
    mutationFn: ({ entry }: { entry: TimeEntry; previous: TimeEntry | null }) => repository.save(entry),
    onSuccess: (_, { entry, previous }) => {
      push({
        description: previous ? `Edit ${entry.category}` : `Add ${entry.category}`,
        undo: async () => {
          if (previous) {
            await repository.save(previous)
          } else {
            await repository.delete(entry.id)
          }
          invalidate()
        },
        redo: async () => {
          await repository.save(entry)
          invalidate()
        },
      })
      invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (entry: TimeEntry) => repository.delete(entry.id),
    onSuccess: (_, entry) => {
      push({
        description: `Delete ${entry.category}`,
        undo: async () => {
          await repository.save(entry)
          invalidate()
        },
        redo: async () => {
          await repository.delete(entry.id)
          invalidate()
        },
      })
      invalidate()
    },
  })

  return { save, remove }
}
