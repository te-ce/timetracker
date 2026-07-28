import { useCallback } from 'react'
import { loadExcelHandle, saveExcelHandle, clearExcelHandle } from '../../infra/storage/folder-handle-store'
import { useDirectoryPicker } from './useDirectoryPicker'

export function LocalExcelFolderSettings() {
  const load = useCallback(() => loadExcelHandle().then((h) => h?.name ?? null), [])
  const save = useCallback((handle: FileSystemDirectoryHandle) => saveExcelHandle(handle), [])

  const {
    name: excelFolderName,
    picking,
    error,
    pick,
    reset,
  } = useDirectoryPicker({ load, save, clear: clearExcelHandle })

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
                type="button"
                onClick={() => void pick()}
                disabled={picking}
                className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => void reset()}
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
              type="button"
              onClick={() => void pick()}
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
