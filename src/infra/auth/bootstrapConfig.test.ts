import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readBootstrapConfig,
  writeBootstrapConfig,
  clearBootstrapConfig,
  isSetupSkipped,
  skipSetup,
  setLocalFolderMode,
  LOCAL_FOLDER_MODE_STORAGE_KEY,
} from './bootstrapConfig'

const STORAGE_KEY = 'msal-bootstrap-config'
const SKIPPED_KEY = 'msal-bootstrap-skipped'

const reloadMock = vi.fn()

beforeEach(() => {
  localStorage.clear()
  reloadMock.mockClear()
  Object.defineProperty(window.location, 'reload', {
    value: reloadMock,
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  delete window.electronAPI
})

describe('readBootstrapConfig', () => {
  it('returns null when nothing stored', () => {
    expect(readBootstrapConfig()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json')
    expect(readBootstrapConfig()).toBeNull()
  })

  it('returns null when fields are missing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ clientId: 'x' }))
    expect(readBootstrapConfig()).toBeNull()
  })

  it('returns the config when valid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ clientId: 'cid', tenantId: 'tid' }))
    expect(readBootstrapConfig()).toEqual({ clientId: 'cid', tenantId: 'tid' })
  })
})

describe('writeBootstrapConfig', () => {
  it('persists config to localStorage', () => {
    writeBootstrapConfig({ clientId: 'cid', tenantId: 'tid' })
    expect(readBootstrapConfig()).toEqual({ clientId: 'cid', tenantId: 'tid' })
    expect(reloadMock).toHaveBeenCalledOnce()
  })

  it('clears the skipped flag on save', () => {
    localStorage.setItem(SKIPPED_KEY, 'true')
    writeBootstrapConfig({ clientId: 'cid', tenantId: 'tid' })
    expect(isSetupSkipped()).toBe(false)
  })
})

describe('clearBootstrapConfig', () => {
  it('removes config and skipped flag', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ clientId: 'cid', tenantId: 'tid' }))
    localStorage.setItem(SKIPPED_KEY, 'true')
    clearBootstrapConfig()
    expect(readBootstrapConfig()).toBeNull()
    expect(isSetupSkipped()).toBe(false)
  })

  it('mirrors the local-folder-mode flag to Electron storage so the main process can see it', () => {
    const put = vi.fn(() => Promise.resolve())
    window.electronAPI = {
      storage: { get: () => Promise.resolve(null), put, delete: () => Promise.resolve() },
    } as unknown as NonNullable<typeof window.electronAPI>
    clearBootstrapConfig()
    expect(put).toHaveBeenCalledWith(LOCAL_FOLDER_MODE_STORAGE_KEY, false)
  })
})

describe('setLocalFolderMode', () => {
  it('mirrors the local-folder-mode flag to Electron storage so the main process can see it', () => {
    const put = vi.fn(() => Promise.resolve())
    window.electronAPI = {
      storage: { get: () => Promise.resolve(null), put, delete: () => Promise.resolve() },
    } as unknown as NonNullable<typeof window.electronAPI>
    setLocalFolderMode()
    expect(put).toHaveBeenCalledWith(LOCAL_FOLDER_MODE_STORAGE_KEY, true)
  })

  it('does not throw when Electron APIs are unavailable (browser mode)', () => {
    expect(() => setLocalFolderMode()).not.toThrow()
  })
})

describe('skipSetup / isSetupSkipped', () => {
  it('returns false by default', () => {
    expect(isSetupSkipped()).toBe(false)
  })

  it('returns true after skipSetup()', () => {
    skipSetup()
    expect(isSetupSkipped()).toBe(true)
  })
})
