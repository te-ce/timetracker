import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../../shared/queryKeys'
import type { ConfigRepository } from '../../infra/repositories/types'
import { listLocalXlsxFiles, listLocalSheets } from '../excel/localExcelService'

interface Props {
  repository: ConfigRepository
}

interface FileSelectorProps {
  xlsxFiles: string[]
  currentFile: string
  loading: boolean
  onScanFiles: () => void
  onFileChange: (filename: string) => void
}

function FileSelector({ xlsxFiles, currentFile, loading, onScanFiles, onFileChange }: FileSelectorProps) {
  const showFilePicker = xlsxFiles.length > 0
  const showCurrentFileHint = currentFile !== '' && xlsxFiles.length === 0
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onScanFiles}
          disabled={loading}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
        >
          {loading ? 'Scanning…' : 'Scan folder for .xlsx files'}
        </button>
      </div>
      {showFilePicker && (
        <select
          aria-label="Excel workbook file"
          value={currentFile}
          onChange={(e) => onFileChange(e.target.value)}
          className="w-64 rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">— select a file —</option>
          {xlsxFiles.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
      {showCurrentFileHint && <p className="text-xs text-green-700 dark:text-emerald-400">✓ {currentFile}</p>}
    </div>
  )
}

interface SheetSelectorProps {
  sheets: string[]
  currentSheet: string
  loading: boolean
  onLoadSheets: () => void
  onSelectSheet: (sheet: string) => void
}

function SheetPickerSection({ sheets, currentSheet, loading, onLoadSheets, onSelectSheet }: SheetSelectorProps) {
  const showSheetPicker = sheets.length > 0
  const showCurrentSheetHint = currentSheet !== '' && sheets.length === 0
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onLoadSheets}
          disabled={loading}
          className="rounded border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load sheets'}
        </button>
      </div>
      {showSheetPicker && (
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
    </div>
  )
}

export function LocalExcelSettings({ repository }: Props) {
  const queryClient = useQueryClient()
  const { data: config } = useQuery({ queryKey: QUERY_KEYS.config, queryFn: () => repository.get() })

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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
  })

  const sheetMutation = useMutation({
    mutationFn: async (sheet: string) => {
      const current = await repository.get()
      await repository.save({ ...current, targetSheet: sheet || null })
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config }),
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
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Local Excel Workbook</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select the Excel file and worksheet tab to use for sprint export.
        </p>
      </div>

      <FileSelector
        xlsxFiles={xlsxFiles}
        currentFile={currentFile}
        loading={loading}
        onScanFiles={() => void handleScanFiles()}
        onFileChange={(f) => void handleFileChange(f)}
      />

      {currentFile && (
        <SheetPickerSection
          sheets={sheets}
          currentSheet={currentSheet}
          loading={loading}
          onLoadSheets={() => void handleLoadSheets()}
          onSelectSheet={(s) => sheetMutation.mutate(s)}
        />
      )}

      {loadError && (
        <p role="alert" className="text-xs text-red-600">
          {loadError}
        </p>
      )}
    </section>
  )
}
