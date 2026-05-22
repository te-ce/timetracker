const DB_NAME = 'timetracker-fs'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'folder'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('Failed to open IndexedDB'))
  })
}

export async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('Failed to save folder handle'))
  })
  db.close()
}

export async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb()
  const result = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onsuccess = () =>
      resolve((req.result as FileSystemDirectoryHandle | undefined) ?? null)
    req.onerror = () => reject(new Error('Failed to load folder handle'))
  })
  db.close()
  return result
}

export async function clearHandle(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error('Failed to clear folder handle'))
  })
  db.close()
}

export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  // Cast to avoid ESLint not resolving File System Access API permission types
  const fsHandle = handle as {
    queryPermission(opts: { mode: string }): Promise<string>
    requestPermission(opts: { mode: string }): Promise<string>
  }
  if ((await fsHandle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  if ((await fsHandle.requestPermission({ mode: 'readwrite' })) === 'granted') return true
  return false
}
