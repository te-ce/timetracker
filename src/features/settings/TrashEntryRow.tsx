import { formatDeletedAt } from './formatDeletedAt'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateTrash, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import type { TrashEntry, TrashRepository } from '../../infra/repositories/types'

export function TrashEntryRow({ entry, trashRepo }: { entry: TrashEntry; trashRepo: TrashRepository }) {
  const queryClient = useQueryClient()

  const restoreMutation = useMutation({
    mutationFn: () => trashRepo.restore(entry.id),
    onSuccess: () => {
      invalidateTrash(queryClient)
      invalidateMonthByYearMonth(queryClient, entry.year, entry.month)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => trashRepo.purge(entry.id),
    onSuccess: () => invalidateTrash(queryClient),
  })

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium dark:text-gray-100">
          {entry.type === 'day' ? 'Day' : 'Month'}: {entryLabel(entry)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Deleted {formatDeletedAt(entry.deletedAt)}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => restoreMutation.mutate()}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={() => deleteMutation.mutate()}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete permanently
        </button>
      </div>
    </div>
  )
}

function entryLabel(entry: TrashEntry): string {
  if (entry.type === 'day' && entry.date) return entry.date
  const monthLabel = new Date(entry.year, entry.month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  return monthLabel
}
