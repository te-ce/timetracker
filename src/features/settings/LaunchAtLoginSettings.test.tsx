import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LaunchAtLoginSettings } from './LaunchAtLoginSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { DEFAULT_APP_CONFIG as defaultAppConfig } from '../../shared/appConfigDefaults'
import type { AppConfig } from '../../infra/repositories/types'

const mockAutolaunch = { get: vi.fn(), set: vi.fn() }

beforeEach(() => {
  mockAutolaunch.get.mockResolvedValue(false)
  mockAutolaunch.set.mockResolvedValue(undefined)
  Object.defineProperty(window, 'electronAPI', {
    value: { autolaunch: mockAutolaunch },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  Object.defineProperty(window, 'electronAPI', { value: undefined, writable: true, configurable: true })
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('LaunchAtLoginSettings', () => {
  it('renders unchecked when launchAtLogin is false', async () => {
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, launchAtLogin: false })
    render(<LaunchAtLoginSettings repository={repo} />, { wrapper })
    const toggle = await screen.findByRole('checkbox', { name: /launch at login/i })
    expect(toggle).not.toBeChecked()
  })

  it('renders checked when launchAtLogin is true', async () => {
    const repo = new InMemoryConfigRepository({ ...defaultAppConfig, launchAtLogin: true })
    render(<LaunchAtLoginSettings repository={repo} />, { wrapper })
    const toggle = await screen.findByRole('checkbox', { name: /launch at login/i })
    expect(toggle).toBeChecked()
  })

  it('renders unchecked when launchAtLogin is undefined', async () => {
    const repo = new InMemoryConfigRepository()
    render(<LaunchAtLoginSettings repository={repo} />, { wrapper })
    const toggle = await screen.findByRole('checkbox', { name: /launch at login/i })
    expect(toggle).not.toBeChecked()
  })

  it('saves launchAtLogin true and calls electronAPI when toggled on', async () => {
    const repo = new InMemoryConfigRepository()
    render(<LaunchAtLoginSettings repository={repo} />, { wrapper })
    const toggle = await screen.findByRole('checkbox', { name: /launch at login/i })
    await userEvent.click(toggle)
    const saved = await repo.get()
    expect(saved.launchAtLogin).toBe(true)
    expect(mockAutolaunch.set).toHaveBeenCalledWith(true)
  })

  it('saves launchAtLogin false and calls electronAPI when toggled off', async () => {
    const config: AppConfig = { ...defaultAppConfig, launchAtLogin: true }
    const repo = new InMemoryConfigRepository(config)
    render(<LaunchAtLoginSettings repository={repo} />, { wrapper })
    const toggle = await screen.findByRole('checkbox', { name: /launch at login/i })
    await userEvent.click(toggle)
    const saved = await repo.get()
    expect(saved.launchAtLogin).toBe(false)
    expect(mockAutolaunch.set).toHaveBeenCalledWith(false)
  })
})
