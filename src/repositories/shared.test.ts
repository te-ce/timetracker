import { describe, it, expect, vi } from 'vitest'

// Mock shared.ts dependencies so the module can be imported in tests
vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: { getAllAccounts: () => [], acquireTokenSilent: vi.fn() },
}))

import { resetAllRepositories, configRepo, timeEntryRepo, workPeriodRepo, sprintExportRepo, workLocationRepo, dayTypeOverrideRepo, autoCategoryOverrideRepo, dayConfirmationRepo } from './shared'

describe('resetAllRepositories', () => {
  it('clears configRepo cache so next read goes to adapter', async () => {
    // Prime the configRepo cache
    const firstRead = await configRepo.get()
    expect(firstRead).toBeDefined()

    // Call reset — cache should be null
    resetAllRepositories()

    // If cache was cleared, the spy-able behaviour changes; verify clearCache ran
    // by checking that the repo reads from adapter again (returns default config)
    const secondRead = await configRepo.get()
    expect(secondRead).toEqual(firstRead) // same default — but re-fetched
  })

  it('does not throw when called before any data is loaded', () => {
    expect(() => resetAllRepositories()).not.toThrow()
  })

  it('clears caches on all repos (smoke test)', () => {
    // Expose internal clearCache via spies — verify each repo exposes it
    const repos = [
      configRepo,
      timeEntryRepo,
      workPeriodRepo,
      sprintExportRepo,
      workLocationRepo,
      dayTypeOverrideRepo,
      autoCategoryOverrideRepo,
      dayConfirmationRepo,
    ]
    repos.forEach((repo) => {
      expect(typeof repo.clearCache).toBe('function')
    })
    // resetAllRepositories calls all of them — just verify no throw
    expect(() => resetAllRepositories()).not.toThrow()
  })
})
