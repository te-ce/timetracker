import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MonthRepository, WorkLocation } from '../../infra/repositories/types'
import { invalidateMonth } from '../../shared/queryKeys'

interface UseDayMutationsInput {
  date: string
  effectiveLocation: WorkLocation
  repository: MonthRepository
}

export function useDayMutations({ date, effectiveLocation, repository }: UseDayMutationsInput) {
  const queryClient = useQueryClient()

  const confirm = useMutation({
    mutationFn: () => repository.confirmDay(date),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const unconfirm = useMutation({
    mutationFn: () => repository.unconfirmDay(date),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const toggleLocation = useMutation({
    mutationFn: () => repository.toggleLocation(date, effectiveLocation),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const saveNote = useMutation({
    mutationFn: (note: string) => repository.saveNote(date, note),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  const resetDay = useMutation({
    mutationFn: () => repository.resetDay(date),
    onSuccess: () => invalidateMonth(queryClient, date),
  })

  return { confirm, unconfirm, toggleLocation, saveNote, resetDay }
}
