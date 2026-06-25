import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SprintArchiveSettings } from './SprintArchiveSettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('SprintArchiveSettings', () => {
  it('renders a checkbox for archiving sprint to separate sheet', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SprintArchiveSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeInTheDocument()
  })

  it('is unchecked by default', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SprintArchiveSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).not.toBeChecked()
  })

  it('is checked when archiveSprintSheet is true in config', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, archiveSprintSheet: true })
    render(<SprintArchiveSettings repository={repo} />, { wrapper })
    expect(await screen.findByRole('checkbox')).toBeChecked()
  })

  it('saves archiveSprintSheet=true when checked', async () => {
    const repo = new InMemoryConfigRepository()
    render(<SprintArchiveSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.archiveSprintSheet).toBe(true)
    })
  })

  it('saves archiveSprintSheet=false when unchecked', async () => {
    const repo = new InMemoryConfigRepository({ ...DEFAULT_APP_CONFIG, archiveSprintSheet: true })
    render(<SprintArchiveSettings repository={repo} />, { wrapper })
    await userEvent.click(await screen.findByRole('checkbox'))
    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.archiveSprintSheet).toBe(false)
    })
  })
})
