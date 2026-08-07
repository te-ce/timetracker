import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/RepositoryContext'
import { QUERY_KEYS, invalidateTrash, invalidateMonthByYearMonth } from '../../shared/queryKeys'
import { listBackups, restoreBackup, deleteBackup } from '../../infra/storage/localBackup'
import { useConfigFieldMutation } from './useConfigFieldMutation'
import type { ConfigRepository, TrashEntry, TrashRepository } from '../../infra/repositories/types'

interface Props {
  repository: ConfigRepository
}

const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'forever', label: 'Keep forever' },
]

function entryLabel(entry: TrashEntry): string {
  if (entry.type === 'day' && entry.date) return entry.date
  const monthLabel = new Date(entry.year, entry.month - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
  return monthLabel
}

function formatDeletedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function TrashEntryRow({ entry, trashRepo }: { entry: TrashEntry; trashRepo: TrashRepository }) {
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

function BackupRow({ backup }: { backup: { id: string; createdAt: string } }) {
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

export function TrashSettings({ repository }: Props) {
  const { trashRepo } = useRepositories()
  const queryClient = useQueryClient()

  const { config, mutation: retentionMutation } = useConfigFieldMutation<number | null>(
    repository,
    (cfg, trashRetentionDays) => ({ ...cfg, trashRetentionDays }),
  )
  const retentionDays = config?.trashRetentionDays === undefined ? 30 : config.trashRetentionDays

  const { data: entries = [] } = useQuery({ queryKey: QUERY_KEYS.trash, queryFn: () => trashRepo.list() })
  const { data: backups = [] } = useQuery({ queryKey: QUERY_KEYS.trashBackups, queryFn: () => listBackups() })

  useEffect(() => {
    if (retentionDays === null) return
    void trashRepo.purgeExpired(retentionDays).then(() => invalidateTrash(queryClient))
  }, [retentionDays, trashRepo, queryClient])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="trash-retention-select">
          Keep deleted items for
        </label>
        <select
          id="trash-retention-select"
          value={retentionDays === null ? 'forever' : String(retentionDays)}
          onChange={(e) => retentionMutation.mutate(e.target.value === 'forever' ? null : Number(e.target.value))}
          className="w-fit rounded border border-gray-300 bg-transparent pl-2 pr-6 py-1 text-sm dark:border-gray-600"
        >
          {RETENTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Deleted months, days, and local-data backups older than this are removed automatically.
        </p>
      </div>

      {entries.length === 0 && backups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nothing in trash.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <TrashEntryRow key={entry.id} entry={entry} trashRepo={trashRepo} />
          ))}
          {backups.map((backup) => (
            <BackupRow key={backup.id} backup={backup} />
          ))}
        </div>
      )}
    </div>
  )
}
