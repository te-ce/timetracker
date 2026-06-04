import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, WorkPeriodSlice, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSlice,
  removeSlice,
  startLiveSlice as doStartLiveSlice,
  stopLiveSlice as doStopLiveSlice,
  stopPeriod as doStopPeriod,
} from '../domain/dayUpdaters'

export function useWorkPeriodMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, window }: { date: string; window: WorkPeriod }) =>
      repository.updateDay(date, (day) => upsertWindow(day, window)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const remove = useMutation({
    mutationFn: ({ date, id }: { date: string; id: string }) =>
      repository.updateDay(date, (day) => removeWindow(day, id)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const saveWithAbsorbed = useMutation({
    mutationFn: ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.updateDay(date, (day) => {
        const withoutAbsorbed = { ...day, windows: day.windows.filter((w) => !absorbed.includes(w.id)) }
        return upsertWindow(withoutAbsorbed, window)
      }),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const setPeriodCategory = useMutation({
    mutationFn: ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.updateDay(date, (day) => updatePeriodCategory(day, periodId, category)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const addSlice = useMutation({
    mutationFn: ({ date, periodId, slice }: { date: string; periodId: string; slice: WorkPeriodSlice }) =>
      repository.updateDay(date, (day) => upsertSlice(day, periodId, slice)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const deleteSlice = useMutation({
    mutationFn: ({ date, periodId, sliceId }: { date: string; periodId: string; sliceId: string }) =>
      repository.updateDay(date, (day) => removeSlice(day, periodId, sliceId)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const startLiveSlice = useMutation({
    mutationFn: ({
      date,
      periodId,
      slice,
    }: {
      date: string
      periodId: string
      slice: WorkPeriodSlice & { startedAt: string }
    }) => repository.updateDay(date, (day) => doStartLiveSlice(day, periodId, slice)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const stopLiveSlice = useMutation({
    mutationFn: ({
      date,
      periodId,
      sliceId,
      stoppedAt,
    }: {
      date: string
      periodId: string
      sliceId: string
      stoppedAt: string
    }) => repository.updateDay(date, (day) => doStopLiveSlice(day, periodId, sliceId, stoppedAt)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const stopPeriod = useMutation({
    mutationFn: ({
      date,
      periodId,
      endTime,
      liveSliceId,
      stoppedAt,
    }: {
      date: string
      periodId: string
      endTime: string
      liveSliceId?: string
      stoppedAt?: string
    }) => repository.updateDay(date, (day) => doStopPeriod(day, periodId, endTime, liveSliceId, stoppedAt)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  return {
    save,
    remove,
    saveWithAbsorbed,
    setPeriodCategory,
    addSlice,
    deleteSlice,
    startLiveSlice,
    stopLiveSlice,
    stopPeriod,
  }
}
