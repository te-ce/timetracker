import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OvertimeBarSettings } from './OvertimeBarSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('OvertimeBarSettings', () => {
  it('renders toggle for showing overtime bar', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OvertimeBarSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is checked by default (overtime bar shown)', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OvertimeBarSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('is unchecked when showOvertimeBar is false in config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showOvertimeBar: false })
    render(<OvertimeBarSettings repository={repo} />, { wrapper })
    const checkbox = await screen.findByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('saves showOvertimeBar=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<OvertimeBarSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showOvertimeBar).toBe(false)
    })
  })

  it('saves showOvertimeBar=true when re-checked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, showOvertimeBar: false })
    render(<OvertimeBarSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.showOvertimeBar).toBe(true)
    })
  })
})
