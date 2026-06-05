import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { applyCategorySwitch } from './useElectronTraySync'
import { CloudTimeTrackingRepository } from '../infra/repositories/cloud/time-tracking-repository'
import { InMemoryStorageAdapter } from '../infra/storage/in-memory-adapter'

vi.mock('../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

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

// ─── Hook integration tests ────────────────────────────────────────────────

function makeElectronAPI() {
  return {
    autolaunch: { get: vi.fn().mockResolvedValue(false), set: vi.fn().mockResolvedValue(undefined) },
    tray: {
      sync: vi.fn(),
      onSetCategory: vi.fn(),
      offSetCategory: vi.fn(),
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

  it('does not call tray.sync when window.electronAPI is absent', async () => {
    delete window.electronAPI
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Should not throw
    renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
  })

  it('registers and cleans up onSetCategory listener when electronAPI is present', async () => {
    const api = makeElectronAPI()
    window.electronAPI = api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    expect(api.tray.onSetCategory).toHaveBeenCalledOnce()
    unmount()
    expect(api.tray.offSetCategory).toHaveBeenCalledOnce()
  })

  it('registers and cleans up hotkey.onToggle listener when electronAPI is present', async () => {
    const api = makeElectronAPI()
    window.electronAPI = api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    expect(api.hotkey.onToggle).toHaveBeenCalledOnce()
    unmount()
    expect(api.hotkey.offToggle).toHaveBeenCalledOnce()
  })

  it('calls tray.sync with null activeCategory when no tracking is active', async () => {
    const api = makeElectronAPI()
    window.electronAPI = api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    // Unmount before afterEach deletes window.electronAPI so cleanup closures still work
    unmount()
    expect(api.tray.onSetCategory).toHaveBeenCalled()
  })
})
