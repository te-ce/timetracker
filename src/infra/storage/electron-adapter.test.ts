import { describe, it, expect, beforeEach } from 'vitest'
import { ElectronStorageAdapter } from './electron-adapter'

function makeStub() {
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
    _store: store,
  }
}

beforeEach(() => {
  const stub = makeStub()
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
    },
    hotkey: { onToggle: () => {}, offToggle: () => {}, setGlobal: () => Promise.resolve() },
    storage: stub,
    notify: { goalReached: () => {} },
  }
})

describe('ElectronStorageAdapter', () => {
  it('returns null for unknown key', async () => {
    const adapter = new ElectronStorageAdapter()
    expect(await adapter.get('missing')).toBeNull()
  })

  it('stores and retrieves a value', async () => {
    const adapter = new ElectronStorageAdapter()
    await adapter.put('config', { theme: 'dark' })
    const result = await adapter.get<{ theme: string }>('config')
    expect(result?.theme).toBe('dark')
  })

  it('deletes a stored value', async () => {
    const adapter = new ElectronStorageAdapter()
    await adapter.put('foo', { x: 1 })
    await adapter.delete('foo')
    expect(await adapter.get('foo')).toBeNull()
  })
})
