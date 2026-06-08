import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AutoCategorySettings } from './AutoCategorySettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('AutoCategorySettings', () => {
  it('shows current autoCategory selection', async () => {
    const config = { ...DEFAULT_APP_CONFIG, autoCategory: '_COREMEDIA' }
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
    const config = { ...DEFAULT_APP_CONFIG, autoCategory: '_SUPPORT' }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '')
    const saved = await repo.get()
    expect(saved.autoCategory).toBeNull()
  })

  it('shows custom categories in the dropdown', async () => {
    const config = { ...DEFAULT_APP_CONFIG, customCategories: ['ProjectX'] }
    const repo = new InMemoryConfigRepository(config)
    render(<AutoCategorySettings repository={repo} />, { wrapper })
    const select = await screen.findByLabelText(/auto category/i)
    if (!(select instanceof HTMLSelectElement)) throw new Error('Expected HTMLSelectElement')
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toContain('ProjectX')
  })
})
