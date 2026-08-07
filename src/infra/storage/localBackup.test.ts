// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// Fresh in-memory IndexedDB per test — localBackup uses the global `indexedDB` directly.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  vi.unstubAllGlobals()
})

let _v = 0
async function freshModule() {
  _v++
  return import(`./localBackup?v=${_v}`) as Promise<typeof import('./localBackup')>
}

describe('snapshotLocalStorage', () => {
  it('collects only keys matching the tracked prefixes', async () => {
    const m = await freshModule()
    const storage = new Map([
      ['timetracker_config.json', '{"a":1}'],
      ['msal-bootstrap.keys', 'xyz'],
      ['unrelated-app-key', 'nope'],
    ])
    vi.stubGlobal('localStorage', {
      length: storage.size,
      key: (i: number) => [...storage.keys()][i] ?? null,
      getItem: (k: string) => storage.get(k) ?? null,
    })
    const snapshot = m.snapshotLocalStorage()
    expect(snapshot).toEqual({
      'timetracker_config.json': '{"a":1}',
      'msal-bootstrap.keys': 'xyz',
    })
  })
})

describe('saveBackup / listBackups / restoreBackup / deleteBackup', () => {
  it('saves a backup and lists it', async () => {
    const m = await freshModule()
    await m.saveBackup({ timetracker_config: '{}' })
    const backups = await m.listBackups()
    expect(backups).toHaveLength(1)
  })

  it('restores the exact snapshot that was saved', async () => {
    const m = await freshModule()
    const id = await m.saveBackup({ timetracker_config: '{"x":1}' })
    const restored = await m.restoreBackup(id)
    expect(restored).toEqual({ timetracker_config: '{"x":1}' })
  })

  it('deletes a backup so it no longer lists or restores', async () => {
    const m = await freshModule()
    const id = await m.saveBackup({ timetracker_config: '{}' })
    await m.deleteBackup(id)
    expect(await m.listBackups()).toHaveLength(0)
    expect(await m.restoreBackup(id)).toBeNull()
  })
})
