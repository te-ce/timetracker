import { beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HotkeySettings } from './HotkeySettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { defaultHotkeyConfig } from '../../shared/hotkeyConfig'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeElectronApiStub(): NonNullable<typeof window.electronAPI> {
  return {
    autolaunch: { get: () => Promise.resolve(false), set: () => Promise.resolve() },
    tray: {
      sync: () => {},
      onStartSubtask: () => () => {},
      onStopSubtask: () => () => {},
      onTick: () => () => {},
      onStopAll: () => () => {},
      onStartWorkPeriod: () => () => {},
      onTogglePresentingMode: () => () => {},
    },
    hotkey: {
      onToggle: () => () => {},
      onTogglePresenting: () => () => {},
      setGlobal: () => Promise.resolve(true),
      setPresenting: () => Promise.resolve(true),
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
    log: { write: () => {}, read: () => Promise.resolve([]) },
    window: { onShow: () => () => {}, show: () => {} },
  }
}

beforeEach(() => {
  window.electronAPI = makeElectronApiStub()
})

describe('HotkeySettings', () => {
  it('shows the presenting-mode global hotkey as unassigned by default', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    render(<HotkeySettings repository={repo} />, { wrapper })
    const row = await screen.findByText(/privacy mode/i)
    expect(row.parentElement?.textContent).toContain('disabled')
  })

  it('capturing a key for the presenting-mode hotkey persists it as an accelerator and updates the live registration', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    const setPresenting = vi.fn(() => Promise.resolve(true))
    window.electronAPI = { ...makeElectronApiStub(), hotkey: { ...makeElectronApiStub().hotkey, setPresenting } }
    render(<HotkeySettings repository={repo} />, { wrapper })

    await userEvent.click(await screen.findByLabelText(/change privacy mode shortcut/i))
    await userEvent.keyboard('{Control>}{Shift>}P{/Shift}{/Control}')

    const saved = await repo.get()
    expect(saved.hotkeys?.presentingMode).toBe('CommandOrControl+Shift+P')
    expect(setPresenting).toHaveBeenCalledWith('CommandOrControl+Shift+P')
  })

  it('disabling the presenting-mode hotkey persists null and leaves it unassigned (no default to fall back to)', async () => {
    const repo = new InMemoryConfigRepository({
      ...DEFAULT_APP_CONFIG,
      hotkeys: { ...defaultHotkeyConfig(), presentingMode: 'CommandOrControl+Shift+P' },
    })
    render(<HotkeySettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByLabelText(/disable privacy mode shortcut/i))
    const saved = await repo.get()
    expect(saved.hotkeys?.presentingMode).toBeNull()
    expect(await screen.findByText(/privacy mode/i).then((row) => row.parentElement?.textContent)).toContain('disabled')
  })

  it('persists the new global hotkey to the repository before updating the live OS registration', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    const calls: string[] = []
    const originalUpdate = repo.update.bind(repo)
    repo.update = (patch) => {
      calls.push('persist')
      return originalUpdate(patch)
    }
    window.electronAPI = {
      ...makeElectronApiStub(),
      hotkey: {
        ...makeElectronApiStub().hotkey,
        setPresenting: () => {
          calls.push('live-update')
          return Promise.resolve(true)
        },
      },
    }
    render(<HotkeySettings repository={repo} />, { wrapper })

    await userEvent.click(await screen.findByLabelText(/change privacy mode shortcut/i))
    await userEvent.keyboard('P')

    expect(calls).toEqual(['persist', 'live-update'])
  })

  it('says so when the OS refuses the global hotkey, e.g. another app already uses it', async () => {
    const repo = new InMemoryConfigRepository(DEFAULT_APP_CONFIG)
    window.electronAPI = {
      ...makeElectronApiStub(),
      hotkey: { ...makeElectronApiStub().hotkey, setGlobal: () => Promise.resolve(false) },
    }
    render(<HotkeySettings repository={repo} />, { wrapper })

    await userEvent.click(await screen.findByLabelText(/change toggle tracking shortcut/i))
    await userEvent.keyboard('{Control>}{Shift>}T{/Shift}{/Control}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not register/i)
  })
})
