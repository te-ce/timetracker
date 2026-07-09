import { describe, it, expect, beforeEach } from 'vitest'
import { ElectronLocalFolderStorageAdapter, LOCAL_FOLDER_PATH_KEY } from './electron-local-folder-adapter'

function makeStorageStub() {
  const store = new Map<string, unknown>()
  return {
    get: <T>(key: string): Promise<T | null> =>
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      Promise.resolve(store.has(key) ? (store.get(key) as T) : null),
    put: <T>(key: string, data: T): Promise<void> => {
      store.set(key, data)
      return Promise.resolve()
    },
    delete: (key: string): Promise<void> => {
      store.delete(key)
      return Promise.resolve()
    },
  }
}

function makeLocalFolderStub() {
  const files = new Map<string, unknown>()
  const fileKey = (basePath: string, key: string) => `${basePath}/${key}`
  return {
    pickFolder: (): Promise<string | null> => Promise.resolve('/chosen/folder'),
    get: <T>(basePath: string, key: string): Promise<T | null> => {
      const k = fileKey(basePath, key)
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return Promise.resolve(files.has(k) ? (files.get(k) as T) : null)
    },
    put: <T>(basePath: string, key: string, data: T): Promise<void> => {
      files.set(fileKey(basePath, key), data)
      return Promise.resolve()
    },
    delete: (basePath: string, key: string): Promise<void> => {
      files.delete(fileKey(basePath, key))
      return Promise.resolve()
    },
  }
}

let storageStub: ReturnType<typeof makeStorageStub>

beforeEach(() => {
  storageStub = makeStorageStub()
  window.electronAPI = {
    autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
    tray: {
      sync: () => {},
      onStartSubtask: () => {},
      offStartSubtask: () => {},
      onStopSubtask: () => {},
      offStopSubtask: () => {},
      onStopAll: () => {},
      offStopAll: () => {},
      onStartWorkPeriod: () => {},
      offStartWorkPeriod: () => {},
      onTogglePresentingMode: () => {},
      offTogglePresentingMode: () => {},
    },
    hotkey: {
      onToggle: () => {},
      offToggle: () => {},
      onTogglePresenting: () => {},
      offTogglePresenting: () => {},
      setGlobal: () => Promise.resolve(),
    },
    storage: storageStub,
    localFolder: makeLocalFolderStub(),
    notify: { goalReached: () => {}, sprintExportDue: () => {} },
    window: { onShow: () => {}, offShow: () => {} },
  }
})

describe('ElectronLocalFolderStorageAdapter', () => {
  it('falls back to the browser handle adapter when no path is configured', async () => {
    // jsdom has no indexedDB; reaching that error proves the fallback adapter was used
    // instead of throwing "No local folder configured." for the fs-path adapter.
    const adapter = new ElectronLocalFolderStorageAdapter()
    await expect(adapter.get('config')).rejects.toThrow('indexedDB is not defined')
  })

  it('stores and retrieves a value under the configured folder path', async () => {
    await storageStub.put(LOCAL_FOLDER_PATH_KEY, '/chosen/folder')
    const adapter = new ElectronLocalFolderStorageAdapter()
    await adapter.put('config', { theme: 'dark' })
    const result = await adapter.get<{ theme: string }>('config')
    expect(result?.theme).toBe('dark')
  })

  it('deletes a stored value', async () => {
    await storageStub.put(LOCAL_FOLDER_PATH_KEY, '/chosen/folder')
    const adapter = new ElectronLocalFolderStorageAdapter()
    await adapter.put('foo', { x: 1 })
    await adapter.delete('foo')
    expect(await adapter.get('foo')).toBeNull()
  })
})
