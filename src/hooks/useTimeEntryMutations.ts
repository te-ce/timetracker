import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'
import { useUndoStore } from '../stores/undoStore'
import { upsertEntry, removeEntry } from '../domain/dayUpdaters'

export function useTimeEntryMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()
  const push = useUndoStore((s) => s.push)

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, entry }: { date: string; entry: TimeEntry; previous: TimeEntry | null }) =>
      repository.updateDay(date, (day) => upsertEntry(day, entry)),
    onSuccess: (_, { date, entry, previous }) => {
      push({
        description: previous ? `Edit ${entry.category}` : `Add ${entry.category}`,
        undo: async () => {
          if (previous) {
            await repository.updateDay(date, (day) => upsertEntry(day, previous))
          } else {
            await repository.updateDay(date, (day) => removeEntry(day, entry.id))
          }
          invalidate(date)
        },
        redo: async () => {
          await repository.updateDay(date, (day) => upsertEntry(day, entry))
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const remove = useMutation({
    mutationFn: ({ date, entry }: { date: string; entry: TimeEntry }) =>
      repository.updateDay(date, (day) => removeEntry(day, entry.id)),
    onSuccess: (_, { date, entry }) => {
      push({
        description: `Delete ${entry.category}`,
        undo: async () => {
          await repository.updateDay(date, (day) => upsertEntry(day, entry))
          invalidate(date)
        },
        redo: async () => {
          await repository.updateDay(date, (day) => removeEntry(day, entry.id))
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  return { save, remove }
}
