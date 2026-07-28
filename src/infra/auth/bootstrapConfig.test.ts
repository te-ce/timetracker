import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readBootstrapConfig,
  writeBootstrapConfig,
  clearBootstrapConfig,
  isSetupSkipped,
  skipSetup,
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
