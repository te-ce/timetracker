import { formatDeletedAt } from './formatDeletedAt'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateTrash } from '../../shared/queryKeys'
import { restoreBackup, deleteBackup } from '../../infra/storage/localBackup'

export function BackupRow({ backup }: { backup: { id: string; createdAt: string } }) {
  const queryClient = useQueryClient()

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const snapshot = await restoreBackup(backup.id)
      if (!snapshot) return
      for (const [key, value] of Object.entries(snapshot)) {
        localStorage.setItem(key, value)
      }
    },
    onSuccess: () => {
      invalidateTrash(queryClient)
      window.location.reload()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteBackup(backup.id),
    onSuccess: () => invalidateTrash(queryClient),
  })

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium dark:text-gray-100">Local data backup</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Saved {formatDeletedAt(backup.createdAt)}</span>
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
