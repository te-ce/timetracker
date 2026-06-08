import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RemainingTimeSettings } from './RemainingTimeSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('RemainingTimeSettings', () => {
  it('renders a toggle for the remaining time reference', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('checkbox is checked by default (planned-stop mode active)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('checkbox is unchecked when remainingTimeReference is target-hours', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, remainingTimeReference: 'target-hours' })
    render(<RemainingTimeSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('saves remainingTimeReference=target-hours when unchecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.remainingTimeReference).toBe('target-hours')
    })
  })

  it('saves remainingTimeReference=planned-stop when re-checked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, remainingTimeReference: 'target-hours' })
    render(<RemainingTimeSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.remainingTimeReference).toBe('planned-stop')
    })
  })
})
