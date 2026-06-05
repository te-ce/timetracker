import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, WorkPeriodSubtask, MonthRepository } from '../repositories/types'
import { invalidateMonth } from './queryKeys'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSubtask,
  removeSubtask,
  startLiveSubtask as doStartLiveSubtask,
  stopLiveSubtask as doStopLiveSubtask,
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

  const addSubtask = useMutation({
    mutationFn: ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.updateDay(date, (day) => upsertSubtask(day, periodId, subtask)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const deleteSubtask = useMutation({
    mutationFn: ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.updateDay(date, (day) => removeSubtask(day, periodId, subtaskId)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const startLiveSubtask = useMutation({
    mutationFn: ({
      date,
      periodId,
      subtask,
    }: {
      date: string
      periodId: string
      subtask: WorkPeriodSubtask & { startedAt: string }
    }) => repository.updateDay(date, (day) => doStartLiveSubtask(day, periodId, subtask)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const stopLiveSubtask = useMutation({
    mutationFn: ({
      date,
      periodId,
      subtaskId,
      stoppedAt,
    }: {
      date: string
      periodId: string
      subtaskId: string
      stoppedAt: string
    }) => repository.updateDay(date, (day) => doStopLiveSubtask(day, periodId, subtaskId, stoppedAt)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const stopPeriod = useMutation({
    mutationFn: ({
      date,
      periodId,
      endTime,
      liveSubtaskId,
      stoppedAt,
    }: {
      date: string
      periodId: string
      endTime: string
      liveSubtaskId?: string
      stoppedAt?: string
    }) => repository.updateDay(date, (day) => doStopPeriod(day, periodId, endTime, liveSubtaskId, stoppedAt)),
    onSuccess: (_, { date }) => invalidate(date),
  })

  return {
    save,
    remove,
    saveWithAbsorbed,
    setPeriodCategory,
    addSubtask,
    deleteSubtask,
    startLiveSubtask,
    stopLiveSubtask,
    stopPeriod,
  }
}
