import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, invalidateConfig } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { listSheets } from '../excel/excelService'
import { useAuthStore } from '../../shared/authStore'
import { getAccessToken } from '../../infra/auth/msalInstance'

interface Props {
  repository: ConfigRepository
}

function getNotReadyHint(sharepointUrl: string | undefined): string {
  if (!sharepointUrl) return 'Enter a SharePoint URL first'
  return 'Sign in to load sheets'
}

interface SheetSelectorBodyProps {
  isReady: boolean
  loadingSheets: boolean
  sheets: string[]
  currentSheet: string
  loadError: string | null
  showSaveError: boolean
  onLoadSheets: () => void
  onSelectSheet: (sheet: string) => void
  notReadyHint: string
}

function SheetSelectorBody({
  isReady,
  loadingSheets,
  sheets,
  currentSheet,
  loadError,
  showSaveError,
  onLoadSheets,
  onSelectSheet,
  notReadyHint,
}: SheetSelectorBodyProps) {
  const showNotReadyHint = !isReady
  const showCurrentSheetHint = currentSheet !== '' && sheets.length === 0
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onLoadSheets}
          disabled={!isReady || loadingSheets}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
          aria-label="Load sheets from workbook"
        >
          {loadingSheets ? 'Loading…' : 'Load sheets'}
        </button>
        {showNotReadyHint && <span className="text-xs text-gray-400 dark:text-gray-500">{notReadyHint}</span>}
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600">
          {loadError}
        </p>
      )}

      {sheets.length > 0 && (
        <select
          aria-label="Target sheet"
          value={currentSheet}
          onChange={(e) => onSelectSheet(e.target.value)}
          className="w-64 rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">— select a sheet —</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {showCurrentSheetHint && <p className="text-xs text-green-700 dark:text-emerald-400">✓ {currentSheet}</p>}

      {showSaveError && (
        <p role="alert" className="text-xs text-red-600">
          Failed to save sheet selection.
        </p>
      )}
    </>
  )
}

export function SheetSelector({ repository }: Props) {
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })

  const [sheets, setSheets] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingSheets, setLoadingSheets] = useState(false)

  const sharepointUrl = config?.sharepointUrl

  async function handleLoadSheets() {
    if (!sharepointUrl || !isAuthenticated) return
    setLoadError(null)
    setLoadingSheets(true)
    try {
      const token = await getAccessToken()
      const result = await listSheets(sharepointUrl, token)
      setSheets(result)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load sheets')
    } finally {
      setLoadingSheets(false)
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (sheet: string) => {
      const current = await repository.get()
      await repository.save({ ...current, targetSheet: sheet || null })
    },
    onSuccess: () => invalidateConfig(queryClient),
  })

  if (!config) return null

  const isReady = !!sharepointUrl && isAuthenticated
  const currentSheet = config.targetSheet ?? ''

  return (
    <section aria-label="Target sheet settings" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Target Sheet</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">Select the worksheet tab to write sprint data into.</p>
      <SheetSelectorBody
        isReady={isReady}
        loadingSheets={loadingSheets}
        sheets={sheets}
        currentSheet={currentSheet}
        loadError={loadError}
        showSaveError={saveMutation.isError}
        onLoadSheets={() => void handleLoadSheets()}
        onSelectSheet={(sheet) => saveMutation.mutate(sheet)}
        notReadyHint={getNotReadyHint(sharepointUrl ?? undefined)}
      />
    </section>
  )
}
