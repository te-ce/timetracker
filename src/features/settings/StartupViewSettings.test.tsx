import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StartupViewSettings } from './StartupViewSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('StartupViewSettings', () => {
  it('renders a select with all 5 startup view options', async () => {
    const repo = new InMemoryConfigRepository()
    render(<StartupViewSettings repository={repo} />, { wrapper })
    const select = await screen.findByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /day view/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /month view/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Table View' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /table.*work period/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /last view/i })).toBeInTheDocument()
  })

  it('defaults to "day" when no startupView in config', async () => {
    const repo = new InMemoryConfigRepository()
    render(<StartupViewSettings repository={repo} />, { wrapper })
    const select = await screen.findByRole('combobox')
    expect(select).toHaveValue('day')
  })

  it('reflects existing startupView from config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, startupView: 'month' })
    render(<StartupViewSettings repository={repo} />, { wrapper })
    const select = await screen.findByRole('combobox')
    expect(select).toHaveValue('month')
  })

  it('saves the selected view to the repository', async () => {
    const repo = new InMemoryConfigRepository()
    render(<StartupViewSettings repository={repo} />, { wrapper })
    await userEvent.selectOptions(await screen.findByRole('combobox'), 'table-with-log')
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.startupView).toBe('table-with-log')
    })
  })
})
