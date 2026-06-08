import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OfficeStatsSettings } from './OfficeStatsSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('OfficeStatsSettings', () => {
  it('renders toggle for office stats', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OfficeStatsSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is checked by default (office stats enabled)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OfficeStatsSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeChecked()
  })

  it('is unchecked when officeStats is false in config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, officeStats: false })
    render(<OfficeStatsSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).not.toBeChecked()
  })

  it('saves officeStats=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OfficeStatsSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.officeStats).toBe(false)
    })
  })

  it('saves officeStats=true when re-checked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, officeStats: false })
    render(<OfficeStatsSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.officeStats).toBe(true)
    })
  })
})
