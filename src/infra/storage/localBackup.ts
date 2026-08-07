export const LOCALSTORAGE_PREFIXES = ['timetracker', 'msal-bootstrap']

const DB_NAME = 'timetracker-backups'
const STORE_NAME = 'snapshots'

interface BackupRecord {
  id: string
  createdAt: string
  snapshot: Record<string, string>
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('Failed to open IndexedDB'))
  })
}

export function snapshotLocalStorage(): Record<string, string> {
  const snapshot: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && LOCALSTORAGE_PREFIXES.some((p) => key.startsWith(p))) {
      const value = localStorage.getItem(key)
      if (value !== null) snapshot[key] = value
    }
  }
  return snapshot
}

export async function saveBackup(snapshot: Record<string, string>): Promise<string> {
  const record: BackupRecord = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), snapshot }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('Failed to save backup'))
  })
  db.close()
  return record.id
}

export async function listBackups(): Promise<{ id: string; createdAt: string }[]> {
  const db = await openDb()
  const records = await new Promise<BackupRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      const result: unknown = req.result
      resolve(Array.isArray(result) ? (result as BackupRecord[]) : [])
    }
    req.onerror = () => reject(new Error('Failed to list backups'))
  })
  db.close()
  return records.map(({ id, createdAt }) => ({ id, createdAt })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function restoreBackup(id: string): Promise<Record<string, string> | null> {
  const db = await openDb()
  const record = await new Promise<BackupRecord | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(id)
    req.onsuccess = () => {
      const result: unknown = req.result
      resolve((result as BackupRecord | undefined) ?? null)
    }
    req.onerror = () => reject(new Error('Failed to restore backup'))
  })
  db.close()
  return record?.snapshot ?? null
}

export async function deleteBackup(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('Failed to delete backup'))
  })
  db.close()
}
