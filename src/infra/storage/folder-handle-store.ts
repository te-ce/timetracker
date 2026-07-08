const DB_NAME = 'timetracker-fs'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'folder'
const EXCEL_HANDLE_KEY = 'excel-folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('Failed to open IndexedDB'))
  })
}

async function getHandleByKey(key: string): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  const result = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => {
      const handle: unknown = req.result
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      resolve((handle as FileSystemDirectoryHandle | undefined) ?? null)
    }
    req.onerror = () => reject(new Error(`Failed to load handle: ${key}`))
  })
  db.close()
  return result
}

async function setHandleByKey(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`Failed to save handle: ${key}`))
  })
  db.close()
}

async function deleteHandleByKey(key: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(`Failed to clear handle: ${key}`))
  })
  db.close()
}

// App data folder
export const saveHandle = (h: FileSystemDirectoryHandle) => setHandleByKey(HANDLE_KEY, h)
export const loadHandle = () => getHandleByKey(HANDLE_KEY)

// Excel folder (optional — falls back to app data folder in callers)
export const saveExcelHandle = (h: FileSystemDirectoryHandle) => setHandleByKey(EXCEL_HANDLE_KEY, h)
export const loadExcelHandle = () => getHandleByKey(EXCEL_HANDLE_KEY)
export const clearExcelHandle = () => deleteHandleByKey(EXCEL_HANDLE_KEY)

export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  // requestPermission() requires a user gesture — calling it without one (e.g. during
  // automatic startup loading) can reject or hang indefinitely in some browsers.
  if (!navigator.userActivation.isActive) return false
  if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') return true
  return false
}
