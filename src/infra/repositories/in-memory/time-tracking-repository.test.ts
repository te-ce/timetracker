// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { InMemoryTimeTrackingRepository } from './time-tracking-repository'

describe('InMemoryTimeTrackingRepository', () => {
  describe('getActive', () => {
    it('returns null when nothing started', async () => {
      const repo = new InMemoryTimeTrackingRepository()
      expect(await repo.getActive()).toBeNull()
    })
  })

  describe('start', () => {
    it('sets active tracking with category, date, and startedAt', async () => {
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_COREMEDIA')
      const active = await repo.getActive()
      expect(active?.category).toBe('_COREMEDIA')
      expect(active?.date).toBe('2026-06-07')
      expect(active?.startedAt).toBeDefined()
    })

    it('overwrites previous active when called again', async () => {
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_COREMEDIA')
      await repo.start('2026-06-07', '_SUPPORT')
      const active = await repo.getActive()
      expect(active?.category).toBe('_SUPPORT')
    })
  })

  describe('stop', () => {
    it('returns null when nothing is active', async () => {
      const repo = new InMemoryTimeTrackingRepository()
      expect(await repo.stop()).toBeNull()
    })

    it('clears active after stop', async () => {
      vi.useFakeTimers()
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_COREMEDIA')
      vi.advanceTimersByTime(60 * 60 * 1000)
      await repo.stop()
      expect(await repo.getActive()).toBeNull()
      vi.useRealTimers()
    })

    it('returns hours, category, and date when elapsed time is positive', async () => {
      vi.useFakeTimers()
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_COREMEDIA')
      vi.advanceTimersByTime(90 * 60 * 1000)
      const result = await repo.stop()
      expect(result).not.toBeNull()
      expect(result?.category).toBe('_COREMEDIA')
      expect(result?.date).toBe('2026-06-07')
      expect(result?.hours).toBe(1.5)
      vi.useRealTimers()
    })

    it('rounds hours to 2 decimal places', async () => {
      vi.useFakeTimers()
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_SUPPORT')
      vi.advanceTimersByTime(45 * 60 * 1000)
      const result = await repo.stop()
      expect(result?.hours).toBe(0.75)
      vi.useRealTimers()
    })

    it('returns null when elapsed is zero (stop immediately after start)', async () => {
      vi.useFakeTimers()
      const repo = new InMemoryTimeTrackingRepository()
      await repo.start('2026-06-07', '_COREMEDIA')
      const result = await repo.stop()
      expect(result).toBeNull()
      vi.useRealTimers()
    })
  })
})
