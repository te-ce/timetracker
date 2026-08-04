import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { useSprintExportAction } from './useSprintExportAction'
import type { ExportStatus } from './sprint'

interface Props {
  repository: ConfigRepository
  onConfigChanged?: () => void
  exportStatus?: ExportStatus | undefined
  exportReady?: boolean | undefined
  onExport?: ((overwrite: boolean) => Promise<void>) | undefined
}

export function SprintConfigPanel({ repository, onConfigChanged, exportStatus, exportReady, onExport }: Props) {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState('')
  const [lengthDays, setLengthDays] = useState('')
  const initialized = useRef(false)

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => repository.get(),
  })

  useEffect(() => {
    if (config && !initialized.current) {
      setStartDate(config.sprintStartDate ?? '')
      setLengthDays(String(config.sprintLengthDays))
      initialized.current = true
    }
  }, [config])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!config) return
      await repository.save({
        ...config,
        sprintStartDate: startDate || null,
        sprintLengthDays: parseInt(lengthDays) || config.sprintLengthDays,
      })
    },
    onSuccess: () => {
      invalidateConfig(queryClient)
      onConfigChanged?.()
    },
  })

  const { exporting, exportError, needsOverwriteConfirm, handleExport } = useSprintExportAction(onExport)

  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-gray-200 pb-3 dark:border-gray-700">
      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span aria-hidden>📅</span>
        Start
        <input
          type="date"
          aria-label="Start date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveMutation.mutate()
          }}
          className="border-0 border-b border-gray-300 bg-transparent px-0 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span aria-hidden>#</span>
        Length
        <input
          type="number"
          aria-label="Length"
          min="1"
          value={lengthDays}
          onChange={(e) => setLengthDays(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveMutation.mutate()
          }}
          className="w-10 border-0 border-b border-gray-300 bg-transparent px-0 py-1 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:text-gray-100"
        />
        <span className="text-gray-400 dark:text-gray-500">days</span>
      </label>

      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Save
      </button>

      {onExport && (
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <span
              className={`h-2 w-2 rounded-full ${exportStatus === 'exported' ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            />
            {exportStatus === 'exported' ? 'Exported' : 'Pending'}
          </span>
          {exportError && (
            <p role="alert" className="text-xs text-red-600">
              {exportError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            data-tooltip={
              !exportReady ? 'Configure SharePoint URL, sheet, and category mapping in Settings first' : undefined
            }
          >
            {exporting ? 'Exporting…' : needsOverwriteConfirm ? 'Export and overwrite' : 'Export'}
          </button>
        </div>
      )}
    </div>
  )
}
