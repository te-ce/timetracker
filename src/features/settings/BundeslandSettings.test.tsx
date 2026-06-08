import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BundeslandSettings } from './BundeslandSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('BundeslandSettings', () => {
  it('shows current federalState selection', async () => {
    const config = { ...DEFAULT_APP_CONFIG, federalState: 'NW' }
    const repo = new InMemoryConfigRepository(config)
    render(<BundeslandSettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/bundesland/i)
    expect(select).toHaveValue('NW')
  })

  it('saves selection when changed', async () => {
    const repo = new InMemoryConfigRepository()
    render(<BundeslandSettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/bundesland/i)
    await userEvent.selectOptions(select, 'BY')
    const saved = await repo.get()
    expect(saved.federalState).toBe('BY')
  })

  it('allows clearing (none)', async () => {
    const config = { ...DEFAULT_APP_CONFIG, federalState: 'HE' }
    const repo = new InMemoryConfigRepository(config)
    render(<BundeslandSettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/bundesland/i)
    await userEvent.selectOptions(select, '')
    const saved = await repo.get()
    expect(saved.federalState).toBeNull()
  })
})
