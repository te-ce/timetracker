import { useState, useEffect } from 'react'
import {
  loadExcelHandle,
  saveExcelHandle,
  clearExcelHandle,
  verifyPermission,
} from '../../infra/storage/folder-handle-store'

export function LocalExcelFolderSettings() {
  const [excelFolderName, setExcelFolderName] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadExcelHandle().then((h) => setExcelFolderName(h?.name ?? null))
  }, [])

  async function handlePick() {
    if (!window.showDirectoryPicker) {
      setError('File System Access API not supported in this browser.')
      return
    }
    setPicking(true)
    setError(null)
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
      const ok = await verifyPermission(handle)
      if (!ok) {
        setError('Permission denied for selected folder.')
        return
      }
      await saveExcelHandle(handle)
      setExcelFolderName(handle.name)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed to open folder picker')
    } finally {
      setPicking(false)
    }
  }

  async function handleReset() {
    await clearExcelHandle()
    setExcelFolderName(null)
    setError(null)
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold dark:text-gray-100">Excel Folder</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          By default the app reads Excel files from the same folder as app data. Set a separate folder if your workbooks
          live elsewhere.
        </p>
      </div>

      <div className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-3 text-sm flex items-center justify-between gap-4">
        {excelFolderName ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                📁
              </span>
              <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{excelFolderName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void handlePick()}
                disabled={picking}
                className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Change
              </button>
              <button
                onClick={() => void handleReset()}
                className="rounded border px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-gray-500 dark:text-gray-400">Same as app data folder</span>
            <button
              onClick={() => void handlePick()}
              disabled={picking}
              className="rounded border px-3 py-1.5 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40 shrink-0"
            >
              {picking ? 'Picking…' : 'Use separate folder'}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  )
}
