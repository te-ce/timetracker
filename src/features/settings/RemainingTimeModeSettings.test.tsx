import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RemainingTimeModeSettings } from './RemainingTimeModeSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('RemainingTimeModeSettings', () => {
  it('renders a toggle for remaining time mode', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeModeSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is unchecked by default (until-zero-overtime mode)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeModeSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('is checked when remainingTimeMode is until-daily-target', async () => {
    const repo = new InMemoryConfigRepository({
      ...DEFAULT_APP_CONFIG,
      remainingTimeMode: 'until-daily-target',
    })
    render(<RemainingTimeModeSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('saves remainingTimeMode=until-daily-target when checked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<RemainingTimeModeSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.remainingTimeMode).toBe('until-daily-target')
    })
  })

  it('saves remainingTimeMode=until-zero-overtime when unchecked', async () => {
    const repo = new InMemoryConfigRepository({
      ...DEFAULT_APP_CONFIG,
      remainingTimeMode: 'until-daily-target',
    })
    render(<RemainingTimeModeSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.remainingTimeMode).toBe('until-zero-overtime')
    })
  })
})
