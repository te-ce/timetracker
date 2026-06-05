import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { useTrackingMutations } from './useTrackingMutations'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { ActiveTracking, TimeTrackingRepository } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0))
}

class ControlledTrackingRepository implements TimeTrackingRepository {
  private active: ActiveTracking | null = null
  private stopOverride: { category: string; date: string; hours: number } | null = null

  queueStop(result: { category: string; date: string; hours: number }): void {
    this.stopOverride = result
  }

  start(date: string, category: string): Promise<void> {
    this.active = { category, date, startedAt: new Date().toISOString() }
    return Promise.resolve()
  }

  stop(): Promise<{ category: string; date: string; hours: number } | null> {
    if (this.stopOverride) {
      const r = this.stopOverride
      this.stopOverride = null
      this.active = null
      return Promise.resolve(r)
    }
    this.active = null
    return Promise.resolve(null)
  }

  getActive(): Promise<ActiveTracking | null> {
    return Promise.resolve(this.active)
  }
}

const date = '2026-05-20'

function makeRepo(initial: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new InMemoryMonthRepository({
    '2026-05': initial as Record<string, import('../../infra/repositories/types').Day>,
  })
}

describe('useTrackingMutations', () => {
  describe('start', () => {
    it('opens an open work period (end === null) in the month repo', async () => {
      const repo = makeRepo()
      const trackingRepo = new ControlledTrackingRepository()
      const { result } = renderHook(() => useTrackingMutations(date, repo, trackingRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.start.mutate('_COREMEDIA')
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      const windows = data[date]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]?.end).toBeNull()
      expect(windows[0]?.category).toBe('_COREMEDIA')
    })

    it('does not add a second open period if one already exists', async () => {
      const repo = makeRepo({
        [date]: { windows: [{ id: 'existing', start: '08:00', end: null, category: '_OTHER', subtasks: [] }] },
      })
      const trackingRepo = new ControlledTrackingRepository()
      const { result } = renderHook(() => useTrackingMutations(date, repo, trackingRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.start.mutate('_COREMEDIA')
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      const openPeriods = (data[date]?.windows ?? []).filter((w) => w.end === null)
      expect(openPeriods).toHaveLength(1)
    })

    it('closes a prior session with hours > 0 before opening a new one', async () => {
      const priorDate = '2026-05-19'
      const repo = makeRepo({
        [priorDate]: { windows: [{ id: 'old', start: '09:00', end: null, category: '_SUPPORT', subtasks: [] }] },
      })
      const trackingRepo = new ControlledTrackingRepository()
      trackingRepo.queueStop({ category: '_SUPPORT', date: priorDate, hours: 1 })

      const { result } = renderHook(() => useTrackingMutations(date, repo, trackingRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.start.mutate('_COREMEDIA')
        await flush()
      })

      const priorData = await repo.getMonth(2026, 5)
      const priorWindows = priorData[priorDate]?.windows ?? []
      expect(priorWindows[0]?.end).not.toBeNull()
    })
  })

  describe('stop', () => {
    it('is a no-op when nothing is actively tracked', async () => {
      const repo = makeRepo({
        [date]: { windows: [{ id: 'p1', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }] },
      })
      const trackingRepo = new ControlledTrackingRepository()
      const { result } = renderHook(() => useTrackingMutations(date, repo, trackingRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.stop.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      expect(data[date]?.windows[0]?.end).toBe('10:00')
    })

    it('closes the open period when stopped with hours > 0', async () => {
      const repo = makeRepo({
        [date]: { windows: [{ id: 'p1', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }] },
      })
      const trackingRepo = new ControlledTrackingRepository()
      await trackingRepo.start(date, '_COREMEDIA')
      trackingRepo.queueStop({ category: '_COREMEDIA', date, hours: 1 })

      const { result } = renderHook(() => useTrackingMutations(date, repo, trackingRepo), {
        wrapper: makeWrapper(makeQC()),
      })

      await act(async () => {
        result.current.stop.mutate()
        await flush()
      })

      const data = await repo.getMonth(2026, 5)
      const windows = data[date]?.windows ?? []
      expect(windows.every((w) => w.end !== null)).toBe(true)
    })
  })
})
