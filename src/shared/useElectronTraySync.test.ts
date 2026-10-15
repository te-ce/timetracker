import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { handleStartSubtask, handleStopSubtask, handleStopAll, handleStartWorkPeriod } from './useElectronTraySync'
import type { WorkPeriod } from '../infra/repositories/types'
import { InMemoryMonthRepository } from '../infra/repositories/in-memory/month-repository'
import preloadSource from '../../electron/preload.cjs?raw'

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
  return {
    repo,
    startLiveSubtask: vi.spyOn(repo, 'startLiveSubtask'),
    stopLiveSubtask: vi.spyOn(repo, 'stopLiveSubtask'),
    stopWorkPeriod: vi.spyOn(repo, 'stopWorkPeriod'),
    openWorkPeriod: vi.spyOn(repo, 'openWorkPeriod'),
  }
}

describe('handleStartSubtask', () => {
  it('starts a new subtask on the open period', async () => {
    const { repo, startLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    expect(startLiveSubtask).toHaveBeenCalledWith(
      '2026-06-09',
      'wp1',
      expect.objectContaining({ category: '_SUPPORT', hours: 0 }),
    )
  })

  it('uses HH:MM format for startedAt', async () => {
    const { repo, startLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    const subtask = startLiveSubtask.mock.calls[0]?.[2]
    expect(subtask?.startedAt).toMatch(/^\d{2}:\d{2}$/)
  })

  it('relies on startLiveSubtask to settle previous subtask (no separate stop call)', async () => {
    const { repo, startLiveSubtask, stopLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStartSubtask('_INFRA', repo, '2026-06-09', windows)
    expect(stopLiveSubtask).not.toHaveBeenCalled()
    expect(startLiveSubtask).toHaveBeenCalledWith(
      '2026-06-09',
      'wp1',
      expect.objectContaining({ category: '_INFRA', startedAt: expect.stringMatching(/^\d{2}:\d{2}$/) }),
    )
  })

  it('does nothing when no open period exists', async () => {
    const { repo, startLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow({ start: '00:01', end: '00:02' })]
    await handleStartSubtask('_SUPPORT', repo, '2026-06-09', windows)
    expect(startLiveSubtask).not.toHaveBeenCalled()
  })
})

describe('handleStopSubtask', () => {
  it('stops the live subtask on the open period', async () => {
    const { repo, stopLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStopSubtask(repo, '2026-06-09', windows)
    expect(stopLiveSubtask).toHaveBeenCalledWith('2026-06-09', 'wp1', 's1', expect.any(String))
  })

  it('does nothing when no live subtask exists', async () => {
    const { repo, stopLiveSubtask } = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStopSubtask(repo, '2026-06-09', windows)
    expect(stopLiveSubtask).not.toHaveBeenCalled()
  })
})

describe('handleStopAll', () => {
  it('stops live subtask and work period', async () => {
    const { repo, stopLiveSubtask, stopWorkPeriod } = makeMockMonthRepo()
    const windows = [makeWindow({ subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '10:00' }] })]
    await handleStopAll(repo, '2026-06-09', windows)
    expect(stopLiveSubtask).toHaveBeenCalled()
    expect(stopWorkPeriod).toHaveBeenCalledWith('2026-06-09', 'wp1', expect.any(String))
  })

  it('stops work period even without live subtask', async () => {
    const { repo, stopLiveSubtask, stopWorkPeriod } = makeMockMonthRepo()
    const windows = [makeWindow()]
    await handleStopAll(repo, '2026-06-09', windows)
    expect(stopLiveSubtask).not.toHaveBeenCalled()
    expect(stopWorkPeriod).toHaveBeenCalled()
  })

  it('does nothing when no open period', async () => {
    const { repo, stopWorkPeriod } = makeMockMonthRepo()
    const windows = [makeWindow({ start: '00:01', end: '00:02' })]
    await handleStopAll(repo, '2026-06-09', windows)
    expect(stopWorkPeriod).not.toHaveBeenCalled()
  })

  it('stops every period with no set stop time, not just one, when several are open', async () => {
    // A period whose subtasks were all stopped, but which was never explicitly
    // closed, still has end: null. If a second, genuinely-tracked period is
    // then started, both are "open" — Stop All must close every one of them.
    const stale = makeWindow({ id: 'wp1', start: '09:00', end: null })
    const active = makeWindow({ id: 'wp2', start: '13:00', end: null })
    const { repo, stopWorkPeriod } = makeMockMonthRepo()
    await handleStopAll(repo, '2026-06-09', [stale, active])
    expect(stopWorkPeriod).toHaveBeenCalledWith('2026-06-09', 'wp1', expect.any(String))
    expect(stopWorkPeriod).toHaveBeenCalledWith('2026-06-09', 'wp2', expect.any(String))
    expect(stopWorkPeriod).toHaveBeenCalledTimes(2)
  })

  it('stops the live subtask on every open period it closes', async () => {
    const first = makeWindow({
      id: 'wp1',
      start: '09:00',
      end: null,
      subtasks: [{ id: 's1', category: '_SUPPORT', hours: 0, startedAt: '09:30' }],
    })
    const second = makeWindow({
      id: 'wp2',
      start: '13:00',
      end: null,
      subtasks: [{ id: 's2', category: '_INFRA', hours: 0, startedAt: '13:15' }],
    })
    const { repo, stopLiveSubtask } = makeMockMonthRepo()
    await handleStopAll(repo, '2026-06-09', [first, second])
    expect(stopLiveSubtask).toHaveBeenCalledWith('2026-06-09', 'wp1', 's1', expect.any(String))
    expect(stopLiveSubtask).toHaveBeenCalledWith('2026-06-09', 'wp2', 's2', expect.any(String))
  })

  it('leaves an already-set stop time untouched while another period is still open', async () => {
    const closed = makeWindow({ id: 'wp1', start: '09:00', end: '23:59' })
    const open = makeWindow({ id: 'wp2', start: '23:00', end: null })
    const { repo, stopWorkPeriod } = makeMockMonthRepo()
    await handleStopAll(repo, '2026-06-09', [closed, open])
    expect(stopWorkPeriod).toHaveBeenCalledWith('2026-06-09', 'wp2', expect.any(String))
    expect(stopWorkPeriod).toHaveBeenCalledTimes(1)
  })

  it('never overwrites a stop time that is already set, even with no period open', async () => {
    // Planned periods carry a stop time the user chose. Stop All only fills
    // empty stop fields — it must not rewrite these to "now".
    const morning = makeWindow({ id: 'wp1', start: '09:00', end: '12:00' })
    const afternoon = makeWindow({ id: 'wp2', start: '13:00', end: '23:59' })
    const { repo, stopWorkPeriod } = makeMockMonthRepo()
    await handleStopAll(repo, '2026-06-09', [morning, afternoon])
    expect(stopWorkPeriod).not.toHaveBeenCalled()
  })

  it('leaves a lone planned-stop period on its own stop time', async () => {
    const planned = makeWindow({ id: 'wp1', start: '09:00', end: '23:59' })
    const { repo, stopWorkPeriod } = makeMockMonthRepo()
    await handleStopAll(repo, '2026-06-09', [planned])
    expect(stopWorkPeriod).not.toHaveBeenCalled()
  })
})

describe('handleStartWorkPeriod', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens a work period on the current day in the month repo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 9, 10, 15))
    const { repo: monthRepo, openWorkPeriod } = makeMockMonthRepo()
    await handleStartWorkPeriod('_SUPPORT', monthRepo)
    expect(openWorkPeriod).toHaveBeenCalledWith('2026-06-09', '_SUPPORT', '10:15')
  })
})

// ─── Hook integration tests ────────────────────────────────────────────────

type IpcListener = (event: unknown, ...args: unknown[]) => void

// Runs the real electron/preload.cjs against a fake ipcRenderer, so the tests
// exercise the actual on/off wiring rather than a hand-written stand-in.
async function makeElectronAPI() {
  const listeners = new Map<string, IpcListener[]>()
  const sent: Array<{ channel: string; data: unknown }> = []
  const ipcRenderer = {
    on: (channel: string, listener: IpcListener) => {
      listeners.set(channel, [...(listeners.get(channel) ?? []), listener])
    },
    removeListener: (channel: string, listener: IpcListener) => {
      const current = listeners.get(channel) ?? []
      const index = current.indexOf(listener)
      if (index >= 0)
        listeners.set(
          channel,
          current.filter((_, i) => i !== index),
        )
    },
    send: (channel: string, data: unknown) => {
      sent.push({ channel, data })
    },
    invoke: () => Promise.resolve(null),
  }
  let exposed: unknown
  const electron = {
    contextBridge: {
      exposeInMainWorld: (_key: string, api: unknown) => {
        exposed = api
      },
    },
    ipcRenderer,
  }
  const moduleUrl = `data:text/javascript,${encodeURIComponent(`export default (require) => {${preloadSource}}`)}`
  const preload: { default: (require: () => unknown) => void } = await import(/* @vite-ignore */ moduleUrl)
  preload.default(() => electron)
  return {
    api: exposed as NonNullable<Window['electronAPI']>,
    emit: (channel: string, ...args: unknown[]) => {
      for (const listener of listeners.get(channel) ?? []) listener({}, ...args)
    },
    listenerCount: (channel: string) => listeners.get(channel)?.length ?? 0,
    traySyncCount: () => sent.filter((m) => m.channel === 'tray:sync').length,
  }
}

const TRAY_CHANNELS = [
  'tray:startSubtask',
  'tray:stopSubtask',
  'tray:stopAll',
  'tray:startWorkPeriod',
  'tray:tick',
  'tray:togglePresentingMode',
  'hotkey:toggle',
  'hotkey:togglePresenting',
]

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

  it('removes every tray and hotkey listener it registered when unmounted', async () => {
    const ipc = await makeElectronAPI()
    window.electronAPI = ipc.api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    for (const channel of TRAY_CHANNELS) expect(ipc.listenerCount(channel)).toBe(1)
    unmount()
    for (const channel of TRAY_CHANNELS) expect(ipc.listenerCount(channel)).toBe(0)
  })

  it('keeps exactly one listener per channel across re-renders', async () => {
    const ipc = await makeElectronAPI()
    window.electronAPI = ipc.api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    await vi.waitFor(() => expect(ipc.traySyncCount()).toBeGreaterThan(0))
    for (let i = 0; i < 5; i++) {
      ipc.emit('tray:tick')
      rerender()
    }
    for (const channel of TRAY_CHANNELS) expect(ipc.listenerCount(channel)).toBe(1)
  })

  it('flips the showWorkedHoursInTray config setting when the tray or hotkey event fires', async () => {
    const ipc = await makeElectronAPI()
    window.electronAPI = ipc.api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const { configRepo } = await import('../infra/repositories/shared')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })
    await vi.waitFor(() => expect(ipc.traySyncCount()).toBeGreaterThan(0))

    ipc.emit('tray:togglePresentingMode')
    await vi.waitFor(async () => expect((await configRepo.get()).showWorkedHoursInTray).toBe(false))
    await vi.waitFor(() => expect(ipc.listenerCount('tray:togglePresentingMode')).toBe(1))

    ipc.emit('hotkey:togglePresenting')
    await vi.waitFor(async () => expect((await configRepo.get()).showWorkedHoursInTray).not.toBe(false))
    expect(ipc.listenerCount('hotkey:togglePresenting')).toBe(1)
  })
})

describe('useElectronTraySync — day rollover while the window stays hidden', () => {
  afterEach(() => {
    delete window.electronAPI
    vi.useRealTimers()
  })

  it('starts a work period from the tray on the current day, not the day the app was last opened', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 1, 17, 0))
    const ipc = await makeElectronAPI()
    window.electronAPI = ipc.api
    const { useElectronTraySync } = await import('./useElectronTraySync')
    const { monthRepo } = await import('../infra/repositories/shared')
    const openWorkPeriod = vi.spyOn(monthRepo, 'openWorkPeriod')
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    renderHook(() => useElectronTraySync(), { wrapper: makeWrapper(queryClient) })

    vi.setSystemTime(new Date(2026, 9, 2, 8, 30))
    ipc.emit('tray:startWorkPeriod', '_COREMEDIA')

    await vi.waitFor(() => expect(openWorkPeriod).toHaveBeenCalledWith('2026-10-02', '_COREMEDIA', '08:30'))
  })
})
