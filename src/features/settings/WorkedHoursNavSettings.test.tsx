import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkedHoursNavSettings } from './WorkedHoursNavSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('WorkedHoursNavSettings', () => {
  it('renders toggle for showing worked hours in nav', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursNavSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is checked by default (worked hours shown)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursNavSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('is unchecked when showWorkedHoursInNav is false in config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showWorkedHoursInNav: false })
    render(<WorkedHoursNavSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('saves showWorkedHoursInNav=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<WorkedHoursNavSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showWorkedHoursInNav).toBe(false)
    })
  })

  it('saves showWorkedHoursInNav=true when re-checked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showWorkedHoursInNav: false })
    render(<WorkedHoursNavSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showWorkedHoursInNav).toBe(true)
    })
  })
})
