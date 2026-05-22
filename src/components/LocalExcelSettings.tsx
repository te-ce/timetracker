import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ConfigRepository } from '../repositories/types'
import { listLocalXlsxFiles, listLocalSheets } from '../services/localExcelService'

interface Props {
  repository: ConfigRepository
}

export function LocalExcelSettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => repository.get() })

  const [xlsxFiles, setXlsxFiles] = useState<string[]>([])
  const [sheets, setSheets] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const currentFile = config?.localExcelFile ?? ''
  const currentSheet = config?.targetSheet ?? ''

  const fileMutation = useMutation({
    mutationFn: async (filename: string) => {
      const current = await repository.get()
      await repository.save({ ...current, localExcelFile: filename || null, targetSheet: null })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  const sheetMutation = useMutation({
    mutationFn: async (sheet: string) => {
      const current = await repository.get()
      await repository.save({ ...current, targetSheet: sheet || null })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['config'] }),
  })

  async function handleScanFiles() {
    setLoadError(null)
    setLoading(true)
    try {
      const files = await listLocalXlsxFiles()
      setXlsxFiles(files)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to scan folder')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(filename: string) {
    fileMutation.mutate(filename)
    if (!filename) {
      setSheets([])
      return
    }
    setLoadError(null)
    try {
      const result = await listLocalSheets(filename)
      setSheets(result)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load sheets')
    }
  }

  async function handleLoadSheets() {
    if (!currentFile) return
    setLoadError(null)
    setLoading(true)
    try {
      const result = await listLocalSheets(currentFile)
      setSheets(result)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load sheets')
    } finally {
      setLoading(false)
    }
  }

  if (!config) return null

  return (
    <section aria-label="Local Excel workbook settings" className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Local Excel Workbook</h3>
        <p className="text-xs text-gray-500 mt-1">
          Select the Excel file and worksheet tab to use for sprint export.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleScanFiles()}
            disabled={loading}
            className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
          >
            {loading ? 'Scanning…' : 'Scan folder for .xlsx files'}
          </button>
        </div>

        {xlsxFiles.length > 0 && (
          <select
            aria-label="Excel workbook file"
            value={currentFile}
            onChange={(e) => void handleFileChange(e.target.value)}
            className="w-64 rounded border px-3 py-2 text-sm"
          >
            <option value="">— select a file —</option>
            {xlsxFiles.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}

        {currentFile && xlsxFiles.length === 0 && (
          <p className="text-xs text-green-700">✓ {currentFile}</p>
        )}
      </div>

      {currentFile && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleLoadSheets()}
              disabled={loading}
              className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              {loading ? 'Loading…' : 'Load sheets'}
            </button>
          </div>

          {sheets.length > 0 && (
            <select
              aria-label="Target sheet"
              value={currentSheet}
              onChange={(e) => sheetMutation.mutate(e.target.value)}
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
        </div>
      )}

      {loadError && (
        <p role="alert" className="text-xs text-red-600">{loadError}</p>
      )}
    </section>
  )
}
