import { useState } from 'react'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { LOCALSTORAGE_PREFIXES, saveBackup, snapshotLocalStorage } from '../../infra/storage/localBackup'

function clearLocalStorage() {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && LOCALSTORAGE_PREFIXES.some((p) => key.startsWith(p))) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}

function deleteIndexedDb(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase('timetracker-fs')
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

export function ClearDataSettings() {
  const [confirming, setConfirming] = useState(false)

  async function handleClear() {
    await saveBackup(snapshotLocalStorage())
    clearLocalStorage()
    await deleteIndexedDb()
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Clear Local Data</span>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Removes all locally stored settings and cached data, then reloads the app. A backup is kept in Settings → Trash
        in case you need it back.
      </p>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-fit rounded border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
      >
        Clear data…
      </button>
      {confirming && (
        <ConfirmDialog
          title="Clear local data?"
          message="This removes all locally stored settings and cached data, then reloads the app. A backup is kept in Settings → Trash and can be restored from there. Restoring won't relink a local folder — you'll need to re-select it."
          confirmLabel="Confirm clear"
          danger
          onConfirm={() => void handleClear()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
