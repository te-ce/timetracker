import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/repositories-context'
import { invalidateMonthByYearMonth } from './queryKeys'
import { useUndoStore } from './undoStore'

/** Moves a whole month to the trash and deletes it, as one undoable action. */
export function useDeleteMonth(year: number, month: number, monthLabel: string) {
  const { monthRepo, trashRepo } = useRepositories()
  const queryClient = useQueryClient()
  // Redo trashes what is in the month at that moment: anything tracked after
  // the undo would otherwise be deleted without reaching the trash.
  const trashAndDelete = async () => {
    const snapshot = await monthRepo.getMonth(year, month)
    const trashId = await trashRepo.moveMonthToTrash(year, month, snapshot)
    await monthRepo.deleteMonth(year, month)
    invalidateMonthByYearMonth(queryClient, year, month)
    return { snapshot, trashId }
  }
  return useMutation({
    mutationFn: trashAndDelete,
    onSuccess: (deleted) => {
      let current = deleted
      useUndoStore.getState().push({
        description: `Delete ${monthLabel}`,
        undo: async () => {
          await monthRepo.restoreMonth(year, month, current.snapshot)
          await trashRepo.purge(current.trashId)
          invalidateMonthByYearMonth(queryClient, year, month)
        },
        redo: async () => {
          current = await trashAndDelete()
        },
      })
    },
  })
}
