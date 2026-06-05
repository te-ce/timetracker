import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HotkeySettings } from './HotkeySettings'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('HotkeySettings', () => {
  it('renders in-app shortcut rows with default keys', async () => {
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    expect(await screen.findByText('Month view')).toBeInTheDocument()
    expect(await screen.findByText('M')).toBeInTheDocument()
    expect(await screen.findByText('Table view')).toBeInTheDocument()
    expect(await screen.findByText('G')).toBeInTheDocument()
  })

  it('shows disabled badge when in-app shortcut is null in config', async () => {
    const repo = new InMemoryConfigRepository({
      ...(await new InMemoryConfigRepository().get()),
      hotkeys: { globalToggle: 'CommandOrControl+Shift+Space', inApp: { monthView: null } },
    })
    render(<HotkeySettings repository={repo} />, { wrapper })
    const rows = await screen.findAllByText(/disabled/i)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('saves null for in-app action when disable button clicked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    const disableButtons = await screen.findAllByRole('button', { name: /disable/i })
    await userEvent.click(disableButtons[0]!)
    const saved = await repo.get()
    const actions = Object.values(saved.hotkeys?.inApp ?? {})
    expect(actions).toContain(null)
  })

  it('saves new key when capture field records a keypress', async () => {
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    const changeButtons = await screen.findAllByRole('button', { name: /change/i })
    await userEvent.click(changeButtons[0]!)
    const captureField = await screen.findByRole('textbox', { name: /press a key/i })
    fireEvent.keyDown(captureField, { key: '1', code: 'Digit1' })
    await waitFor(async () => {
      const saved = await repo.get()
      expect(Object.values(saved.hotkeys?.inApp ?? {})[0]).toBe('1')
    })
  })

  it('shows global hotkey section when electronAPI is present', async () => {
    Object.defineProperty(window, 'electronAPI', {
      value: { hotkey: { setGlobal: vi.fn() }, storage: {}, tray: {}, autolaunch: {}, notify: {} },
      configurable: true,
    })
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    expect(await screen.findByText(/global hotkey/i)).toBeInTheDocument()
    Object.defineProperty(window, 'electronAPI', { value: undefined, configurable: true })
  })

  it('hides global hotkey section when not in Electron', async () => {
    Object.defineProperty(window, 'electronAPI', { value: undefined, configurable: true })
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    await screen.findByText('Month view')
    expect(screen.queryByText(/global hotkey/i)).not.toBeInTheDocument()
  })

  it('saves globalToggle: null when global hotkey disabled', async () => {
    Object.defineProperty(window, 'electronAPI', {
      value: { hotkey: { setGlobal: vi.fn() }, storage: {}, tray: {}, autolaunch: {}, notify: {} },
      configurable: true,
    })
    const repo = new InMemoryConfigRepository()
    render(<HotkeySettings repository={repo} />, { wrapper })
    const disableGlobal = await screen.findByRole('button', { name: /disable global/i })
    await userEvent.click(disableGlobal)
    const saved = await repo.get()
    expect(saved.hotkeys?.globalToggle).toBeNull()
    Object.defineProperty(window, 'electronAPI', { value: undefined, configurable: true })
  })
})
