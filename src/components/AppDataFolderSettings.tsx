import { useState, useEffect } from 'react'
import { loadHandle, saveHandle, verifyPermission } from '../storage/folder-handle-store'

export function AppDataFolderSettings() {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadHandle().then((h) => setFolderName(h?.name ?? null))
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
      await saveHandle(handle)
      window.location.reload()
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Failed to open folder picker')
    } finally {
      setPicking(false)
    }
  }

  if (folderName === null) return null

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-base font-semibold dark:text-gray-100">App Data Folder</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          The folder where time tracking data is stored. Changing this will reload the app.
        </p>
      </div>

      <div className="rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-3 text-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 dark:text-gray-500" aria-hidden>📁</span>
          <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{folderName}</span>
        </div>
        <button
          onClick={() => void handlePick()}
          disabled={picking}
          className="rounded border px-3 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-40 shrink-0"
        >
          {picking ? 'Picking…' : 'Change'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  )
}
