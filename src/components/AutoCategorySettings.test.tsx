import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AutoCategorySettings } from './AutoCategorySettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import type { AppConfig } from '../repositories/types'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('AutoCategorySettings', () => {
  it('shows current autoCategory selection', async () => {
    const config: AppConfig = {
      sollstunden: 8,
      autoCategory: 'Coremedia',
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
    }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    expect(select).toHaveValue('Coremedia')
  })

  it('saves selection when changed', async () => {
    const repo = new InMemoryConfigRepository()
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, 'QA')
    // wait for mutation
    const saved = await repo.get()
    expect(saved.autoCategory).toBe('QA')
  })

  it('allows clearing autoCategory (none option)', async () => {
    const config: AppConfig = {
      sollstunden: 8,
      autoCategory: 'QA',
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
    }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '')
    const saved = await repo.get()
    expect(saved.autoCategory).toBeNull()
  })
})
