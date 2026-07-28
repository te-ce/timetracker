import { useCallback } from 'react'
import { loadHandle, saveHandle } from '../../infra/storage/folder-handle-store'
import { LOCAL_FOLDER_PATH_KEY } from '../../infra/storage/electron-local-folder-adapter'
import { useDirectoryPicker } from './useDirectoryPicker'

export function AppDataFolderSettings() {
  const electronAPI = window.electronAPI

  const load = useCallback(async (): Promise<string | null> => {
    if (electronAPI) {
      const path = await electronAPI.storage.get<string>(LOCAL_FOLDER_PATH_KEY)
      if (path) return path
      // Not yet migrated to a native path — show the browser handle's name so the
      // "Change" button still renders and lets the user re-pick via the native dialog.
      const h = await loadHandle()
      return h?.name ?? null
    }
    const h = await loadHandle()
    return h?.name ?? null
  }, [electronAPI])

  const save = useCallback((handle: FileSystemDirectoryHandle) => saveHandle(handle), [])

  const pickNative = useCallback(async () => {
    if (!electronAPI) return
    const path = await electronAPI.localFolder.pickFolder()
    if (path === null) return
    await electronAPI.storage.put(LOCAL_FOLDER_PATH_KEY, path)
    window.location.reload()
  }, [electronAPI])

  const {
    name: folderName,
    picking,
    error,
    pick,
  } = useDirectoryPicker({
    load,
    save,
    onPicked: () => window.location.reload(),
    pickNative: electronAPI ? pickNative : undefined,
  })

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
          <span className="text-gray-400 dark:text-gray-500" aria-hidden>
            📁
          </span>
          <span className="font-mono text-gray-700 dark:text-gray-300 truncate">{folderName}</span>
        </div>
        <button
          type="button"
          onClick={() => void pick()}
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
