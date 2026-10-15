import { describe, it, expect, beforeAll } from 'vitest'
import { useSyncStatus } from '../storage/sync-status'

type SharedModule = typeof import('./shared')
let resetAllRepositories: SharedModule['resetAllRepositories']
let configRepo: SharedModule['configRepo']
let flushPendingWrites: SharedModule['flushPendingWrites']

beforeAll(async () => {
  localStorage.setItem('msal-bootstrap-config', JSON.stringify({ clientId: 'test-client', tenantId: 'test-tenant' }))
  ;({ resetAllRepositories, configRepo, flushPendingWrites } = await import('./shared'))
  localStorage.removeItem('msal-bootstrap-config')
})

describe('resetAllRepositories', () => {
  it('clears configRepo cache so next read goes to adapter', async () => {
    const firstRead = await configRepo.get()
    expect(firstRead).toBeDefined()

    resetAllRepositories()

    const secondRead = await configRepo.get()
    expect(secondRead).toEqual(firstRead)
  })

  it('does not throw when called before any data is loaded', () => {
    expect(() => resetAllRepositories()).not.toThrow()
  })

  it('does not throw when called multiple times', () => {
    expect(() => resetAllRepositories()).not.toThrow()
    expect(() => resetAllRepositories()).not.toThrow()
  })
})

describe('pending OneDrive writes', () => {
  it('reports a write OneDrive did not accept as pending, and keeps it pending while the retry fails', async () => {
    await configRepo.save({ ...(await configRepo.get()), autoCategory: 'pending-test' })
    expect(useSyncStatus.getState().pendingWrites).toBeGreaterThan(0)

    await flushPendingWrites()

    expect(useSyncStatus.getState().pendingWrites).toBeGreaterThan(0)
    resetAllRepositories()
    expect((await configRepo.get()).autoCategory).toBe('pending-test')
  })
})
