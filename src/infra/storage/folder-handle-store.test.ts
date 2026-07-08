// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// Fresh in-memory IndexedDB for every test — folder-handle-store uses the global
// `indexedDB` directly, so replacing it resets state between runs.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  vi.unstubAllGlobals()
})

// Bust the vitest module cache so each test picks up the new globalThis.indexedDB.
let _v = 0
async function freshModule() {
  _v++
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return import(`./folder-handle-store?v=${_v}`) as Promise<typeof import('./folder-handle-store')>
}

// fake-indexeddb uses structuredClone to store values, which cannot serialize
// objects with function properties.  Real FileSystemDirectoryHandles are
// serializable in browsers, so we represent them as plain serializable objects
// for the save/load tests and add the method-bearing shape only for
// verifyPermission tests (which never touch IndexedDB).
function makeSerializableHandle(name = 'test-dir') {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { kind: 'directory' as const, name } as unknown as FileSystemDirectoryHandle
}

function makeHandleWithPermission(query: PermissionState, request: PermissionState) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    kind: 'directory' as const,
    name: 'dir',
    queryPermission: () => Promise.resolve(query),
    requestPermission: () => Promise.resolve(request),
  } as unknown as FileSystemDirectoryHandle
}

function stubUserActivation(isActive: boolean) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  vi.stubGlobal('navigator', { userActivation: { isActive } } as unknown as Navigator)
}

describe('saveHandle / loadHandle', () => {
  it('returns null when no handle stored', async () => {
    const m = await freshModule()
    expect(await m.loadHandle()).toBeNull()
  })

  it('stores and retrieves the app folder handle', async () => {
    const m = await freshModule()
    const handle = makeSerializableHandle('my-folder')
    await m.saveHandle(handle)
    const loaded = await m.loadHandle()
    expect(loaded).toEqual(handle)
  })

  it('overwrites a previously stored handle', async () => {
    const m = await freshModule()
    const first = makeSerializableHandle('first')
    const second = makeSerializableHandle('second')
    await m.saveHandle(first)
    await m.saveHandle(second)
    const loaded = await m.loadHandle()
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    expect((loaded as unknown as { name: string }).name).toBe('second')
  })
})

describe('saveExcelHandle / loadExcelHandle / clearExcelHandle', () => {
  it('returns null when no excel handle stored', async () => {
    const m = await freshModule()
    expect(await m.loadExcelHandle()).toBeNull()
  })

  it('stores and retrieves the excel folder handle', async () => {
    const m = await freshModule()
    const handle = makeSerializableHandle('excel-dir')
    await m.saveExcelHandle(handle)
    expect(await m.loadExcelHandle()).toEqual(handle)
  })

  it('clears the excel handle', async () => {
    const m = await freshModule()
    await m.saveExcelHandle(makeSerializableHandle('excel-dir'))
    await m.clearExcelHandle()
    expect(await m.loadExcelHandle()).toBeNull()
  })

  it('app handle and excel handle are stored independently', async () => {
    const m = await freshModule()
    const appHandle = makeSerializableHandle('app')
    const excelHandle = makeSerializableHandle('excel')
    await m.saveHandle(appHandle)
    await m.saveExcelHandle(excelHandle)
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const loadedApp = (await m.loadHandle()) as unknown as { name: string }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const loadedExcel = (await m.loadExcelHandle()) as unknown as { name: string }
    expect(loadedApp.name).toBe('app')
    expect(loadedExcel.name).toBe('excel')
    await m.clearExcelHandle()
    expect(await m.loadHandle()).not.toBeNull()
    expect(await m.loadExcelHandle()).toBeNull()
  })
})

describe('verifyPermission', () => {
  it('returns true when queryPermission returns granted', async () => {
    const m = await freshModule()
    expect(await m.verifyPermission(makeHandleWithPermission('granted', 'denied'))).toBe(true)
  })

  it('returns true when queryPermission is prompt, user gesture is active, and requestPermission is granted', async () => {
    stubUserActivation(true)
    const m = await freshModule()
    expect(await m.verifyPermission(makeHandleWithPermission('prompt', 'granted'))).toBe(true)
  })

  it('returns false without calling requestPermission when there is no active user gesture', async () => {
    stubUserActivation(false)
    const m = await freshModule()
    const handle = makeHandleWithPermission('prompt', 'granted')
    expect(await m.verifyPermission(handle)).toBe(false)
  })

  it('returns false when both queryPermission and requestPermission are denied', async () => {
    stubUserActivation(true)
    const m = await freshModule()
    expect(await m.verifyPermission(makeHandleWithPermission('denied', 'denied'))).toBe(false)
  })
})
