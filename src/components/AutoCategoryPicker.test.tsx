import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppConfig } from '../repositories/types'
import { InMemoryConfigRepository, defaultAppConfig } from '../repositories/in-memory/config-repository'
import {
  InMemoryMonthRepository,
  InMemorySprintExportRepository,
  InMemoryTimeTrackingRepository,
} from '../repositories/in-memory'
import { RepositoryProvider } from '../repositories/RepositoryContext'
import type { Repositories } from '../repositories/RepositoryContext'
import { AutoCategoryPicker } from './AutoCategoryPicker'

function makeRepos(config: AppConfig = defaultAppConfig): Repositories {
  return {
    configRepo: new InMemoryConfigRepository(config),
    monthRepo: new InMemoryMonthRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
    timeTrackingRepo: new InMemoryTimeTrackingRepository(),
  }
}

function setup(config: AppConfig = defaultAppConfig) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <RepositoryProvider repos={makeRepos(config)}>
      <QueryClientProvider client={qc}>
        <AutoCategoryPicker />
      </QueryClientProvider>
    </RepositoryProvider>,
  )
  return { qc }
}

describe('AutoCategoryPicker', () => {
  it('renders the Auto category select', async () => {
    setup()
    expect(await screen.findByLabelText(/auto category/i)).toBeInTheDocument()
  })

  it('shows None selected by default when autoCategory is null', async () => {
    setup()
    expect(await screen.findByLabelText(/auto category/i)).toHaveValue('')
  })

  it('reflects a pre-configured autoCategory', async () => {
    setup({ ...defaultAppConfig, autoCategory: '_COREMEDIA' })
    expect(await screen.findByLabelText(/auto category/i)).toHaveValue('_COREMEDIA')
  })

  it('calls save with the chosen category', async () => {
    const repos = makeRepos()
    const saveSpy = vi.spyOn(repos.configRepo, 'save')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <RepositoryProvider repos={repos}>
        <QueryClientProvider client={qc}>
          <AutoCategoryPicker />
        </QueryClientProvider>
      </RepositoryProvider>,
    )
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '_SUPPORT')
    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ autoCategory: '_SUPPORT' })),
    )
  })

  it('calls save with null when None is selected', async () => {
    const repos = makeRepos({ ...defaultAppConfig, autoCategory: '_SUPPORT' })
    const saveSpy = vi.spyOn(repos.configRepo, 'save')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <RepositoryProvider repos={repos}>
        <QueryClientProvider client={qc}>
          <AutoCategoryPicker />
        </QueryClientProvider>
      </RepositoryProvider>,
    )
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '')
    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ autoCategory: null })),
    )
  })

  it('lists custom categories in the dropdown', async () => {
    setup({ ...defaultAppConfig, customCategories: ['ProjectAlpha'] })
    const select = await screen.findByLabelText(/auto category/i)
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toContain('ProjectAlpha')
  })
})
