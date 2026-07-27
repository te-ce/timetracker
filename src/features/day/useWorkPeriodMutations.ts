import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkPeriod, WorkPeriodSubtask, MonthRepository, Day } from '../../infra/repositories/types'
import { invalidateMonth } from '../../shared/queryKeys'
import { useUndoStore } from '../../shared/undoStore'

async function snapshotDay(repository: MonthRepository, date: string): Promise<Day> {
  const year = parseInt(date.slice(0, 4), 10)
  const month = parseInt(date.slice(5, 7), 10)
  const data = await repository.getMonth(year, month)
  return data[date] ?? { windows: [] }
}

export function useWorkPeriodMutations(repository: MonthRepository) {
  const queryClient = useQueryClient()

  function invalidate(date: string) {
    invalidateMonth(queryClient, date)
  }

  // Pushes an undo/redo pair onto the shared undo stack. `redo` replays the
  // mutation that already ran; `undo` restores the day snapshot captured in
  // onMutate. Every work-period mutation below shares this exact shape — the
  // only thing that varies per mutation is the description and the redo call.
  function pushUndoableMutation(date: string, description: string, prev: Day, redo: () => Promise<void>) {
    useUndoStore.getState().push({
      description,
      undo: async () => {
        await repository.updateDay(date, () => prev)
        invalidate(date)
      },
      redo: async () => {
        await redo()
        invalidate(date)
      },
    })
    invalidate(date)
  }

  const save = useMutation({
    mutationFn: ({ date, window }: { date: string; window: WorkPeriod }) => repository.saveWorkPeriod(date, window),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, window }, { prev }) =>
      pushUndoableMutation(date, 'Edit work period', prev, () => repository.saveWorkPeriod(date, window)),
  })

  const remove = useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      await repository.removeWorkPeriod(date, id)
    },
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, id }, { prev }) =>
      pushUndoableMutation(date, 'Delete work period', prev, () => repository.removeWorkPeriod(date, id)),
  })

  const saveWithAbsorbed = useMutation({
    mutationFn: ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, window, absorbed }, { prev }) =>
      pushUndoableMutation(date, 'Merge work periods', prev, () =>
        repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
      ),
  })

  const setPeriodCategory = useMutation({
    mutationFn: ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.setPeriodCategory(date, periodId, category),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, category }, { prev }) =>
      pushUndoableMutation(date, 'Change category', prev, () => repository.setPeriodCategory(date, periodId, category)),
  })

  const addSubtask = useMutation({
    mutationFn: ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.addSubtask(date, periodId, subtask),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, subtask }, { prev }) =>
      pushUndoableMutation(date, 'Add subtask', prev, () => repository.addSubtask(date, periodId, subtask)),
  })

  const deleteSubtask = useMutation({
    mutationFn: ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.removeSubtask(date, periodId, subtaskId),
    onMutate: async ({ date }) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, { date, periodId, subtaskId }, { prev }) =>
      pushUndoableMutation(date, 'Delete subtask', prev, () => repository.removeSubtask(date, periodId, subtaskId)),
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
    },
    onSuccess: (_, { date }) => {
      invalidate(date)
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
