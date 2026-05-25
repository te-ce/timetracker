import { describe, it, expect } from 'vitest'
import { applyCategorySwitch } from './useElectronTraySync'
import { CloudTimeTrackingRepository } from '../repositories/cloud/time-tracking-repository'
import { InMemoryStorageAdapter } from '../storage/in-memory-adapter'

function makeRepo() {
  return new CloudTimeTrackingRepository(new InMemoryStorageAdapter())
}

describe('applyCategorySwitch', () => {
  it('starts tracking when no active session exists', async () => {
    const repo = makeRepo()
    await applyCategorySwitch('_COREMEDIA', repo, '2026-05-25')
    const active = await repo.getActive()
    expect(active?.category).toBe('_COREMEDIA')
    expect(active?.date).toBe('2026-05-25')
  })

  it('stops tracking when clicking the already active category', async () => {
    const repo = makeRepo()
    await repo.start('2026-05-25', '_COREMEDIA')
    await applyCategorySwitch('_COREMEDIA', repo, '2026-05-25')
    const active = await repo.getActive()
    expect(active).toBeNull()
  })

  it('switches to new category when a different one is active', async () => {
    const repo = makeRepo()
    await repo.start('2026-05-25', '_COREMEDIA')
    await applyCategorySwitch('_SUPPORT', repo, '2026-05-25')
    const active = await repo.getActive()
    expect(active?.category).toBe('_SUPPORT')
  })

  it('stops previous session before starting new one', async () => {
    const repo = makeRepo()
    await repo.start('2026-05-25', '_COREMEDIA')
    await applyCategorySwitch('_SUPPORT', repo, '2026-05-25')
    // only one active session at a time
    const active = await repo.getActive()
    expect(active?.category).toBe('_SUPPORT')
  })
})
