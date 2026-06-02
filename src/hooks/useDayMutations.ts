import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmDay } from '../domain/confirmDay'
import type { WorkPeriod, TimeEntry, MonthRepository, WorkLocation } from '../repositories/types'
import { invalidateMonth } from './queryKeys'

interface UseDayMutationsInput {
  date: string
  windows: WorkPeriod[]
  entries: TimeEntry[]
  autoCategoryOverride: string | null
  globalAutoCategory: string | null
  effectiveLocation: WorkLocation
  repository: MonthRepository
}

export function useDayMutations({
  date,
  windows,
  entries,
  autoCategoryOverride,
  globalAutoCategory,
  effectiveLocation,
  repository,
}: UseDayMutationsInput) {
  const queryClient = useQueryClient()

  const confirm = useMutation({
    mutationFn: () =>
      confirmDay(date, windows, entries, autoCategoryOverride, globalAutoCategory, repository),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const unconfirm = useMutation({
    mutationFn: () => repository.updateDay(date, (day) => ({ ...day, confirmed: false })),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const toggleLocation = useMutation({
    mutationFn: () => {
      const next: WorkLocation = effectiveLocation === 'Remote' ? 'Office' : 'Remote'
      return repository.updateDay(date, (day) => ({ ...day, location: next }))
    },
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const saveNote = useMutation({
    mutationFn: (note: string) =>
      repository.updateDay(date, (day) => {
        const updated = { ...day }
        delete updated.note
        return note ? { ...updated, note } : updated
      }),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const resetDay = useMutation({
    mutationFn: () => repository.updateDay(date, () => ({ entries: [], windows: [] })),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  return { confirm, unconfirm, toggleLocation, saveNote, resetDay }
}
