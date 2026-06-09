import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { handleStartSubtask, handleStopSubtask, handleStopAll } from './useElectronTraySync'
import type { WorkPeriod } from '../infra/repositories/types'
import { InMemoryMonthRepository } from '../infra/repositories/in-memory/month-repository'

vi.mock('../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

function makeWindow(overrides: Partial<WorkPeriod> = {}): WorkPeriod {
  return {
    id: 'wp1',
    start: '09:00',
    end: null,
    category: '_COREMEDIA',
    subtasks: [],
    ...overrides,
  }
}

function makeMockMonthRepo() {
  const repo = new InMemoryMonthRepository()
  vi.spyOn(repo, 'startLiveSubtask')
  vi.spyOn(repo, 'stopLiveSubtask')
  vi.spyOn(repo, 'stopWorkPeriod')
  return repo
}

describe('handleStartSubtask', () => {
  it('starts a new subtask on the open period', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    expect(repo.startLiveSubtask).toHaveBeenCalledWith(
      '2026-06-09',
      'wp1',
      expect.objectContaining({ category: '_SUPPORT', hours: 0 }),
    )
  })

  it('uses HH:MM format for startedAt', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    const subtask = vi.mocked(repo.startLiveSubtask).mock.calls[0]?.[2]
    expect(subtask?.startedAt).toMatch(/^\d{2}:\d{2}$/)
  })

  it('relies on startLiveSubtask to settle previous subtask (no separate stop call)', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStartSubtask('_INFRA', repo, '2026-06-09', windows)
    expect(repo.stopLiveSubtask).not.toHaveBeenCalled()
    expect(repo.startLiveSubtask).toHaveBeenCalledWith(
      '2026-06-09',
      'wp1',
      expect.objectContaining({ category: '_INFRA', startedAt: expect.stringMatching(/^\d{2}:\d{2}$/) }),
    )
  })

  it('does nothing when no open period exists', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow({ end: '17:00' })]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    expect(repo.startLiveSubtask).not.toHaveBeenCalled()
  })
})

describe('handleStopSubtask', () => {
  it('stops the live subtask on the open period', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStopSubtask(repo, '2026-06-09', windows)
    expect(repo.stopLiveSubtask).toHaveBeenCalledWith('2026-06-09', 'wp1', 's1', expect.any(String))
  })

  it('does nothing when no live subtask exists', async () => {
    const repo = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStopSubtask(repo, '2026-06-09', windows)
    expect(repo.stopLiveSubtask).not.toHaveBeenCalled()
  })
})

describe('handleStopAll', () => {
  it('stops live subtask, work period, and active tracking', async () => {
    const repo = makeMockMonthRepo()
    const stopTracking = vi.fn().mockResolvedValue(null)
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStopAll(repo, '2026-06-09', windows, stopTracking)
    expect(repo.stopLiveSubtask).toHaveBeenCalled()
    expect(repo.stopWorkPeriod).toHaveBeenCalledWith('2026-06-09', 'wp1', expect.any(String))
    expect(stopTracking).toHaveBeenCalled()
  })

  it('stops work period even without live subtask', async () => {
    const repo = makeMockMonthRepo()
    const stopTracking = vi.fn().mockResolvedValue(null)
    const windows = [makeWindow()]
    await handleStopAll(repo, '2026-06-09', windows, stopTracking)
    expect(repo.stopLiveSubtask).not.toHaveBeenCalled()
    expect(repo.stopWorkPeriod).toHaveBeenCalled()
    expect(stopTracking).toHaveBeenCalled()
  })

  it('only stops tracking when no open period', async () => {
    const repo = makeMockMonthRepo()
    const stopTracking = vi.fn().mockResolvedValue(null)
    const windows = [makeWindow({ end: '17:00' })]
    await handleStopAll(repo, '2026-06-09', windows, stopTracking)
    expect(repo.stopWorkPeriod).not.toHaveBeenCalled()
    expect(stopTracking).toHaveBeenCalled()
  })
})

// ─── Hook integration tests ────────────────────────────────────────────────

function makeElectronAPI() {
  return {
    autolaunch: { get: vi.fn().mockResolvedValue(false), set: vi.fn().mockResolvedValue(undefined) },
    tray: {
      sync: vi.fn(),
      onStartSubtask: vi.fn(),
      offStartSubtask: vi.fn(),
      onStopSubtask: vi.fn(),
      offStopSubtask: vi.fn(),
      onStopAll: vi.fn(),
      offStopAll: vi.fn(),
    },
    hotkey: {
      onToggle: vi.fn(),
      offToggle: vi.fn(),
      setGlobal: vi.fn().mockResolvedValue(undefined),
    },
    storage: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    notify: { goalReached: vi.fn() },
  }
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useElectronTraySync hook', () => {
  afterEach(() => {
    delete window.electronAPI
  })

  it('does not throw when window.electronAPI is absent', async () => {
    delete window.electronAPI
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
  })

  it('registers and cleans up tray listeners when electronAPI is present', async () => {
    const api = makeElectronAPI()
    window.electronAPI = api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    expect(api.tray.onStartSubtask).toHaveBeenCalledOnce()
    expect(api.tray.onStopSubtask).toHaveBeenCalledOnce()
    expect(api.tray.onStopAll).toHaveBeenCalledOnce()
    unmount()
    expect(api.tray.offStartSubtask).toHaveBeenCalledOnce()
    expect(api.tray.offStopSubtask).toHaveBeenCalledOnce()
    expect(api.tray.offStopAll).toHaveBeenCalledOnce()
  })

  it('registers and cleans up hotkey.onToggle listener', async () => {
    const api = makeElectronAPI()
    window.electronAPI = api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    expect(api.hotkey.onToggle).toHaveBeenCalledOnce()
    unmount()
    expect(api.hotkey.offToggle).toHaveBeenCalledOnce()
  })
})
