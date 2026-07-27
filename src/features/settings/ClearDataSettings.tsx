import { useState } from 'react'

const LOCALSTORAGE_PREFIXES = ['timetracker', 'msal-bootstrap']

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
    clearLocalStorage()
    await deleteIndexedDb()
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Clear Local Data</span>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Removes all locally stored settings and cached data, then reloads the app.
      </p>
      {confirming ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleClear()}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
          >
            Confirm clear
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded border px-3 py-1.5 text-sm dark:border-gray-600 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-fit rounded border border-red-400 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950"
        >
          Clear data…
        </button>
      )}
    </div>
  )
}
