import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository } from '../repositories/types'
import { listSheets } from '../services/excelService'
import { useAuthStore } from '../stores/authStore'

interface Props {
  repository: ConfigRepository
}

export function SheetSelector({ repository }: Props) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => repository.get() })

  const [sheets, setSheets] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingSheets, setLoadingSheets] = useState(false)

  const sharepointUrl = config?.sharepointUrl

  async function handleLoadSheets() {
    if (!sharepointUrl || !accessToken) return
    setLoadError(null)
    setLoadingSheets(true)
    try {
      const result = await listSheets(sharepointUrl, accessToken)
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  if (!config) return null

  const isReady = !!sharepointUrl && !!accessToken
  const currentSheet = config.targetSheet ?? ''

  return (
    <section aria-label="Target sheet settings" className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">Target Sheet</h3>
      <p className="text-xs text-gray-500">
        Select the worksheet tab to write sprint data into.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void handleLoadSheets()}
          disabled={!isReady || loadingSheets}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          aria-label="Load sheets from workbook"
        >
          {loadingSheets ? 'Loading…' : 'Load sheets'}
        </button>
        {!isReady && (
          <span className="text-xs text-gray-400">Enter a SharePoint URL first</span>
        )}
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600">{loadError}</p>
      )}

      {sheets.length > 0 && (
        <select
          aria-label="Target sheet"
          value={currentSheet}
          onChange={(e) => saveMutation.mutate(e.target.value)}
          className="w-64 rounded border px-3 py-2 text-sm"
        >
          <option value="">— select a sheet —</option>
          {sheets.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {currentSheet && sheets.length === 0 && (
        <p className="text-xs text-green-700">✓ {currentSheet}</p>
      )}

      {saveMutation.isError && (
        <p role="alert" className="text-xs text-red-600">Failed to save sheet selection.</p>
      )}
    </section>
  )
}
