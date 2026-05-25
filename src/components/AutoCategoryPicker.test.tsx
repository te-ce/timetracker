import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppConfig } from '../repositories/types'
import { defaultAppConfig } from '../repositories/in-memory/config-repository'

const mockRepo = vi.hoisted(() => ({
  get: vi.fn<[], Promise<AppConfig>>(),
  save: vi.fn<[AppConfig], Promise<void>>(),
  clearCache: vi.fn(),
}))

vi.mock('../repositories/shared', () => ({ configRepo: mockRepo }))

import { AutoCategoryPicker } from './AutoCategoryPicker'

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <AutoCategoryPicker />
    </QueryClientProvider>,
  )
  return { qc }
}

beforeEach(() => {
  mockRepo.get.mockResolvedValue({ ...defaultAppConfig })
  mockRepo.save.mockResolvedValue(undefined)
})

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
    mockRepo.get.mockResolvedValue({ ...defaultAppConfig, autoCategory: '_COREMEDIA' })
    setup()
    expect(await screen.findByLabelText(/auto category/i)).toHaveValue('_COREMEDIA')
  })

  it('calls save with the chosen category', async () => {
    setup()
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '_SUPPORT')
    await waitFor(() =>
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ autoCategory: '_SUPPORT' })),
    )
  })

  it('calls save with null when None is selected', async () => {
    mockRepo.get.mockResolvedValue({ ...defaultAppConfig, autoCategory: '_SUPPORT' })
    setup()
    const select = await screen.findByLabelText(/auto category/i)
    await userEvent.selectOptions(select, '')
    await waitFor(() =>
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ autoCategory: null })),
    )
  })

  it('lists custom categories in the dropdown', async () => {
    mockRepo.get.mockResolvedValue({ ...defaultAppConfig, customCategories: ['ProjectAlpha'] })
    setup()
    const select = await screen.findByLabelText(/auto category/i)
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value)
    expect(options).toContain('ProjectAlpha')
  })
})
