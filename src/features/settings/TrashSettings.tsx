import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRepositories } from '../../infra/repositories/repositories-context'
import { QUERY_KEYS, invalidateTrash } from '../../shared/queryKeys'
import { listBackups } from '../../infra/storage/localBackup'
import { useConfigFieldMutation } from './useConfigFieldMutation'
import type { ConfigRepository } from '../../infra/repositories/types'
import { BackupRow } from './BackupRow'
import { TrashEntryRow } from './TrashEntryRow'

interface Props {
  repository: ConfigRepository
}

const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'forever', label: 'Keep forever' },
]

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
