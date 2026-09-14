import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AutoLaunchToggle } from './AutoLaunchToggle'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function makeElectronAPI(overrides: { get?: () => Promise<boolean>; set?: (v: boolean) => Promise<void> } = {}) {
  return {
    autolaunch: {
      get: overrides.get ?? vi.fn().mockResolvedValue(false),
      set: overrides.set ?? vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as NonNullable<typeof window.electronAPI>
}

describe('AutoLaunchToggle', () => {
  afterEach(() => {
    delete window.electronAPI
  })

  it('reflects the real OS state, not just the stored config value', async () => {
    // Config says enabled, but the OS says it is not actually registered —
    // exactly the drift that leaves the app not launching at login.
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, launchAtLogin: true })
    window.electronAPI = makeElectronAPI({ get: vi.fn().mockResolvedValue(false) })

    render(<AutoLaunchToggle repository={repo} />, { wrapper })

    const switchEl = await screen.findByRole('switch', { name: /launch at login/i })
    await waitFor(() => expect(switchEl).toHaveAttribute('aria-checked', 'false'))
  })

  it('calls the OS autolaunch API before persisting the config value', async () => {
    const repo = new InMemoryConfigRepository()
    const calls: string[] = []
    window.electronAPI = makeElectronAPI({
      set: vi.fn().mockImplementation(async () => {
        calls.push('os-set')
      }),
    })
    const originalSave = repo.save.bind(repo)
    repo.save = vi.fn().mockImplementation(async (config) => {
      calls.push('config-save')
      return originalSave(config)
    })

    render(<AutoLaunchToggle repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('switch', { name: /launch at login/i }))

    await waitFor(() => expect(calls).toEqual(['os-set', 'config-save']))
  })

  it('leaves the stored config untouched when the OS call fails, and shows an error', async () => {
    const repo = new InMemoryConfigRepository()
    window.electronAPI = makeElectronAPI({
      set: vi.fn().mockRejectedValue(new Error('login item registration failed')),
    })

    render(<AutoLaunchToggle repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('switch', { name: /launch at login/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i)
    const saved = await repo.get()
    expect(saved.launchAtLogin).not.toBe(true)
  })

  it('re-reads the real OS state after a failed toggle so the switch never shows a lie', async () => {
    const repo = new InMemoryConfigRepository()
    const get = vi.fn().mockResolvedValue(false)
    window.electronAPI = makeElectronAPI({ get, set: vi.fn().mockRejectedValue(new Error('boom')) })

    render(<AutoLaunchToggle repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('switch', { name: /launch at login/i }))

    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(1))
    expect(await screen.findByRole('switch', { name: /launch at login/i })).toHaveAttribute('aria-checked', 'false')
  })
})
