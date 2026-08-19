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

// Factory for mutations that (a) touch a single day and (b) should be
// undoable by restoring the pre-mutation day snapshot. `redo` is always "run
// mutationFn again with the same variables", so it doesn't need to be passed
// separately — this is what collapses near-identical useMutation blocks down
// to one shape plus a description/mutationFn pair. Exported so features
// outside `day/` (e.g. the table view's "Clear day") can reuse the same
// undo-stack wiring.
export function useUndoableDayMutation<Vars extends { date: string }>(
  repository: MonthRepository,
  description: string,
  mutationFn: (vars: Vars) => Promise<void>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async ({ date }: Vars) => ({ prev: await snapshotDay(repository, date) }),
    onSuccess: (_, vars, { prev }) => {
      useUndoStore.getState().push({
        description,
        undo: async () => {
          await repository.updateDay(vars.date, () => prev)
          invalidateMonth(queryClient, vars.date)
        },
        redo: async () => {
          await mutationFn(vars)
          invalidateMonth(queryClient, vars.date)
        },
      })
      invalidateMonth(queryClient, vars.date)
    },
  })
}

export function useWorkPeriodMutations(repository: MonthRepository) {
  const save = useUndoableDayMutation(
    repository,
    'Edit work period',
    ({ date, window }: { date: string; window: WorkPeriod }) => repository.saveWorkPeriod(date, window),
  )

  const remove = useUndoableDayMutation(
    repository,
    'Delete work period',
    ({ date, id }: { date: string; id: string }) => repository.removeWorkPeriod(date, id),
  )

  const fixOverlap = useUndoableDayMutation(
    repository,
    'Fix subtask overlap',
    ({ date, window }: { date: string; window: WorkPeriod }) => repository.saveWorkPeriod(date, window),
  )

  const saveWithAbsorbed = useUndoableDayMutation(
    repository,
    'Merge work periods',
    ({ date, window, absorbed }: { date: string; window: WorkPeriod; absorbed: string[] }) =>
      repository.saveWorkPeriodWithAbsorbed(date, window, absorbed),
  )

  const setPeriodCategory = useUndoableDayMutation(
    repository,
    'Change category',
    ({ date, periodId, category }: { date: string; periodId: string; category: string }) =>
      repository.setPeriodCategory(date, periodId, category),
  )

  const addSubtask = useUndoableDayMutation(
    repository,
    'Add subtask',
    ({ date, periodId, subtask }: { date: string; periodId: string; subtask: WorkPeriodSubtask }) =>
      repository.addSubtask(date, periodId, subtask),
  )

  const deleteSubtask = useUndoableDayMutation(
    repository,
    'Delete subtask',
    ({ date, periodId, subtaskId }: { date: string; periodId: string; subtaskId: string }) =>
      repository.removeSubtask(date, periodId, subtaskId),
  )

  const startLiveSubtask = useUndoableDayMutation(
    repository,
    'Start subtask',
    ({
      date,
      periodId,
      subtask,
    }: {
      date: string
      periodId: string
      subtask: WorkPeriodSubtask & { startedAt: string }
    }) => repository.startLiveSubtask(date, periodId, subtask),
  )

  const stopLiveSubtask = useUndoableDayMutation(
    repository,
    'Stop subtask',
    ({
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
  )

  const resumeSubtask = useUndoableDayMutation(
    repository,
    'Resume subtask',
    ({ date, periodId, subtaskId, now }: { date: string; periodId: string; subtaskId: string; now: string }) =>
      repository.resumeSubtask(date, periodId, subtaskId, now),
  )

  const stopPeriod = useUndoableDayMutation(
    repository,
    'Stop tracking',
    ({
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
  )

  return {
    save,
    fixOverlap,
    remove,
    saveWithAbsorbed,
    setPeriodCategory,
    addSubtask,
    deleteSubtask,
    startLiveSubtask,
    stopLiveSubtask,
    resumeSubtask,
    stopPeriod,
  }
}
