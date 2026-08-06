import { beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HotkeySettings } from './HotkeySettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { defaultHotkeyConfig, HOTKEY_DEFAULTS } from '../../shared/hotkeyConfig'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeElectronApiStub(): NonNullable<typeof window.electronAPI> {
  return {
    autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
    tray: {
      sync: () => {},
      onStartSubtask: () => {},
      offStartSubtask: () => {},
      onStopSubtask: () => {},
      offStopSubtask: () => {},
      onStopAll: () => {},
      offStopAll: () => {},
      onStartWorkPeriod: () => {},
      offStartWorkPeriod: () => {},
      onTogglePresentingMode: () => {},
      offTogglePresentingMode: () => {},
    },
    hotkey: {
      onToggle: () => {},
      offToggle: () => {},
      onTogglePresenting: () => {},
      offTogglePresenting: () => {},
      setGlobal: () => Promise.resolve(),
      setPresenting: () => Promise.resolve(),
    },
    storage: {
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
    localFolder: {
      pickFolder: () => Promise.resolve(null),
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
    notify: { goalReached: () => {}, sprintExportDue: () => {} },
    window: { onShow: () => {}, offShow: () => {} },
  }
}

beforeEach(() => {
  window.electronAPI = makeElectronApiStub()
})

describe('HotkeySettings', () => {
  it('shows the presenting-mode global hotkey row with its default value', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    render(<HotkeySettings repository={repo} />, { wrapper })
    const row = await screen.findByText(/privacy mode/i)
    expect(row.parentElement?.textContent).toContain(HOTKEY_DEFAULTS.presentingMode)
  })

  it('disabling the presenting-mode hotkey persists null', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    render(<HotkeySettings repository={repo} />, { wrapper })
    await screen.findByText(/privacy mode/i)
    await userEvent.click(await screen.findByLabelText(/disable privacy mode shortcut/i))
    const saved = await repo.get()
    expect(saved.hotkeys?.presentingMode).toBeNull()
  })

  it('re-enabling the presenting-mode hotkey restores the default', async () => {
    const repo = new InMemoryConfigRepository({
      ...DEFAULT_APP_CONFIG,
      hotkeys: { ...defaultHotkeyConfig(), presentingMode: null },
    })
    render(<HotkeySettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByLabelText(/re-enable privacy mode shortcut/i))
    const saved = await repo.get()
    expect(saved.hotkeys?.presentingMode).toBe(HOTKEY_DEFAULTS.presentingMode)
  })
})
