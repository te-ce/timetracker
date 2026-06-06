import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, WorkPeriodSubtask, MonthRepository } from '../../infra/repositories/types'
import { invalidateMonth } from '../../shared/queryKeys'

export function useWorkPeriodMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, window }: { date: string; window: WorkPeriod }) => repository.saveWorkPeriod(date, window),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const remove = useMutation({
    mutationFn: ({ date, id }: { date: string; id: string }) => repository.removeWorkPeriod(date, id),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const saveWithAbsorbed = useMutation({
    mutationFn: ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const setPeriodCategory = useMutation({
    mutationFn: ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.setPeriodCategory(date, periodId, category),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const addSubtask = useMutation({
    mutationFn: ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.addSubtask(date, periodId, subtask),
    onSuccess: (_, { date }) => invalidate(date),
  })

  const deleteSubtask = useMutation({
    mutationFn: ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.removeSubtask(date, periodId, subtaskId),
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
    }) => repository.startLiveSubtask(date, periodId, subtask),
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
    }) => repository.stopLiveSubtask(date, periodId, subtaskId, stoppedAt),
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
      liveSubtaskId?: string | undefined
      stoppedAt?: string | undefined
    }) => repository.stopWorkPeriod(date, periodId, endTime, liveSubtaskId, stoppedAt),
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
