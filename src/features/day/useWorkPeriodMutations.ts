import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  WorkPeriod,
  WorkPeriodSubtask,
  MonthRepository,
  Day,
  TimeTrackingRepository,
} from '../../infra/repositories/types'
import { invalidateMonth, invalidateActiveTracking } from '../../shared/queryKeys'
import { useUndoStore } from '../../shared/undoStore'

async function snapshotDay(repository: MonthRepository, date: string): Promise<Day> {
  const year = parseInt(date.slice(0, 4), 10)
  const month = parseInt(date.slice(5, 7), 10)
  const data = await repository.getMonth(year, month)
  return data[date] ?? { windows: [] }
}

export function useWorkPeriodMutations(repository: MonthRepository, timeTrackingRepository?: TimeTrackingRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  const save = useMutation({
    mutationFn: ({ date, window }: { date: string; window: WorkPeriod }) => repository.saveWorkPeriod(date, window),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, window }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Edit work period',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.saveWorkPeriod(date, window)
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const remove = useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      await repository.removeWorkPeriod(date, id)
      if (timeTrackingRepository) {
        const active = await timeTrackingRepository.getActive()
        if (active?.date === date) await timeTrackingRepository.stop()
      }
    },
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, id }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Delete work period',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.removeWorkPeriod(date, id)
          invalidate(date)
        },
      })
      invalidate(date)
      if (timeTrackingRepository) invalidateActiveTracking(queryClient)
    },
  })

  const saveWithAbsorbed = useMutation({
    mutationFn: ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, window, absorbed }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Merge work periods',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.saveWorkPeriodWithAbsorbed(date, window, absorbed)
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const setPeriodCategory = useMutation({
    mutationFn: ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.setPeriodCategory(date, periodId, category),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, category }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Change category',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.setPeriodCategory(date, periodId, category)
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const addSubtask = useMutation({
    mutationFn: ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.addSubtask(date, periodId, subtask),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, subtask }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Add subtask',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.addSubtask(date, periodId, subtask)
          invalidate(date)
        },
      })
      invalidate(date)
    },
  })

  const deleteSubtask = useMutation({
    mutationFn: ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.removeSubtask(date, periodId, subtaskId),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, subtaskId }, context) => {
      const prev = context.prev
      useUndoStore.getState().push({
        description: 'Delete subtask',
        undo: async () => {
          await repository.updateDay(date, () => prev)
          invalidate(date)
        },
        redo: async () => {
          await repository.removeSubtask(date, periodId, subtaskId)
          invalidate(date)
        },
      })
      invalidate(date)
    },
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
    mutationFn: async ({
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
    }) => {
      await repository.stopWorkPeriod(date, periodId, endTime, liveSubtaskId, stoppedAt)
      if (timeTrackingRepository) {
        const active = await timeTrackingRepository.getActive()
        if (active?.date === date) await timeTrackingRepository.stop()
      }
    },
    onSuccess: (_, { date }) => {
      invalidate(date)
      if (timeTrackingRepository) invalidateActiveTracking(queryClient)
    },
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
