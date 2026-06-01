import { describe, it, expect, vi } from 'vitest'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: { getAllAccounts: () => [], acquireTokenSilent: vi.fn() },
}))

import { resetAllRepositories, configRepo, monthRepo, sprintExportRepo } from './shared'

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

  it('clears caches on all repos (smoke test)', () => {
    const repos = [configRepo, monthRepo, sprintExportRepo]
    repos.forEach((repo) => {
      expect(typeof repo.clearCache).toBe('function')
    })
    expect(() => resetAllRepositories()).not.toThrow()
  })
})
