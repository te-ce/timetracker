import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShowTotalWorkedSettings } from './ShowTotalWorkedSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('ShowTotalWorkedSettings', () => {
  it('renders a toggle for show total worked mode', async () => {
    const repo = new InMemoryConfigRepository()
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is unchecked by default (show remaining, current behaviour)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('is checked when showTotalWorked is true', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showTotalWorked: true })
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('saves showTotalWorked=true when checked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showTotalWorked).toBe(true)
    })
  })

  it('saves showTotalWorked=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showTotalWorked: true })
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showTotalWorked).toBe(false)
    })
  })

  it('shows an error message when save fails', async () => {
    const repo = new InMemoryConfigRepository()
    vi.spyOn(repo, 'save').mockRejectedValue(new Error('disk full'))
    render(<ShowTotalWorkedSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
