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
  // only thing that varies per mutation is the description and the mutation
  // itself (which redo simply re-invokes with the same variables).
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

  // Factory for the six mutations that (a) touch a single day and (b) should
  // be undoable by restoring the pre-mutation day snapshot. `redo` is always
  // "run mutationFn again with the same variables", so it doesn't need to be
  // passed separately — this is what collapsed six near-identical
  // useMutation blocks down to one shape plus a description/mutationFn pair.
  function useUndoableDayMutation<Vars extends { date: string }>(
    description: string,
    mutationFn: (vars: Vars) => Promise<void>,
  ) {
    return useMutation({
      mutationFn,
      onMutate: async ({ date }: Vars) => ({ prev: await snapshotDay(repository, date) }),
      onSuccess: (_, vars, { prev }) => pushUndoableMutation(vars.date, description, prev, () => mutationFn(vars)),
    })
  }

  const save = useUndoableDayMutation('Edit work period', ({ date, window }: { date: string; window: WorkPeriod }) =>
    repository.saveWorkPeriod(date, window),
  )

  const remove = useUndoableDayMutation('Delete work period', ({ date, id }: { date: string; id: string }) =>
    repository.removeWorkPeriod(date, id),
  )

  const saveWithAbsorbed = useUndoableDayMutation(
    'Merge work periods',
    ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
  )

  const setPeriodCategory = useUndoableDayMutation(
    'Change category',
    ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.setPeriodCategory(date, periodId, category),
  )

  const addSubtask = useUndoableDayMutation(
    'Add subtask',
    ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.addSubtask(date, periodId, subtask),
  )

  const deleteSubtask = useUndoableDayMutation(
    'Delete subtask',
    ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.removeSubtask(date, periodId, subtaskId),
  )

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
