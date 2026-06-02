import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { TimeEntry, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'
import { useUndoStore } from '../stores/undoStore'

export function useTimeEntryMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()
  const push = useUndoStore((s) => s.push)

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, entry }: { date: string; entry: TimeEntry; previous: TimeEntry | null }) =>
      repository.updateDay(date, (day) => {
        const filtered = day.entries.filter((e) => e.id !== entry.id)
        return { ...day, entries: [...filtered, entry] }
      }),
    onSuccess: (_, { date, entry, previous }) => {
      push({
        description: previous ? `Edit ${entry.category}` : `Add ${entry.category}`,
        undo: async () => {
          if (previous) {
            await repository.updateDay(date, (day) => ({
              ...day,
              entries: day.entries.map((e) => (e.id === entry.id ? previous : e)),
            }))
          } else {
            await repository.updateDay(date, (day) => ({
              ...day,
              entries: day.entries.filter((e) => e.id !== entry.id),
            }))
          }
          invalidate(date)
        },
        redo: async () => {
          await repository.updateDay(date, (day) => ({
            ...day,
            entries: [...day.entries.filter((e) => e.id !== entry.id), entry],
          }))
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const remove = useMutation({
    mutationFn: ({ date, entry }: { date: string; entry: TimeEntry }) =>
      repository.updateDay(date, (day) => ({
        ...day,
        entries: day.entries.filter((e) => e.id !== entry.id),
      })),
    onSuccess: (_, { date, entry }) => {
      push({
        description: `Delete ${entry.category}`,
        undo: async () => {
          await repository.updateDay(date, (day) => ({
            ...day,
            entries: [...day.entries, entry],
          }))
          invalidate(date)
        },
        redo: async () => {
          await repository.updateDay(date, (day) => ({
            ...day,
            entries: day.entries.filter((e) => e.id !== entry.id),
          }))
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  return { save, remove }
}
