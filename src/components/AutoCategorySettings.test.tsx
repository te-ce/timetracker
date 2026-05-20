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
      autoCategory: '_COREMEDIA',
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: [],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    expect(select).toHaveValue('_COREMEDIA')
  })

  it('saves selection when changed', async () => {
    const repo = new InMemoryConfigRepository()
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '_SUPPORT')
    const saved = await repo.get()
    expect(saved.autoCategory).toBe('_SUPPORT')
  })

  it('allows clearing autoCategory (none option)', async () => {
    const config: AppConfig = {
      sollstunden: 8,
      autoCategory: '_SUPPORT',
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: [],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '')
    const saved = await repo.get()
    expect(saved.autoCategory).toBeNull()
  })

  it('shows custom categories in the dropdown', async () => {
    const config: AppConfig = {
      sollstunden: 8,
      autoCategory: null,
      federalState: null,
      sprintLengthDays: 10,
      sprintStartDate: null,
      customCategories: ['ProjectX'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toContain('ProjectX')
  })
})
