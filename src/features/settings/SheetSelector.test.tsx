import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SheetSelector } from './SheetSelector'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import type { AppConfig } from '../../infra/repositories/types'
import { useAuthStore } from '../../shared/authStore'

vi.mock('../excel/excelService', () => ({
  listSheets: vi.fn(),
}))

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { listSheets } from '../excel/excelService'

const defaultConfig: AppConfig = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
  sharepointUrl: null,
  targetSheet: null,
  categoryMapping: {},
}

function setup(config: Partial<AppConfig> = {}) {
  const repo = new InMemoryConfigRepository({ ...defaultConfig, ...config })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SheetSelector repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: false })
  vi.mocked(listSheets).mockReset()
})

describe('SheetSelector', () => {
  it('renders heading and description', async () => {
    setup()
    expect(await screen.findByText('Target Sheet')).toBeInTheDocument()
    expect(screen.getByText(/select the worksheet tab/i)).toBeInTheDocument()
  })

  it('shows hint to enter SharePoint URL when no url and not authenticated', async () => {
    setup({ sharepointUrl: null })
    expect(await screen.findByText(/enter a sharepoint url first/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load sheets/i })).toBeDisabled()
  })

  it('shows sign-in hint when url is set but not authenticated', async () => {
    setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx' })
    expect(await screen.findByText(/sign in to load sheets/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load sheets/i })).toBeDisabled()
  })

  it('loads and displays sheet options when authenticated', async () => {
    vi.mocked(listSheets).mockResolvedValue(['Sprint 1', 'Sprint 2'])
    useAuthStore.setState({ isAuthenticated: true })
    setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx' })

    await userEvent.click(await screen.findByRole('button', { name: /load sheets/i }))

    expect(await screen.findByRole('option', { name: 'Sprint 1' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sprint 2' })).toBeInTheDocument()
  })

  it('saves selected sheet to the repository', async () => {
    vi.mocked(listSheets).mockResolvedValue(['Sprint 1', 'Sprint 2'])
    useAuthStore.setState({ isAuthenticated: true })
    const { repo } = setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx' })

    await userEvent.click(await screen.findByRole('button', { name: /load sheets/i }))
    const select = await screen.findByLabelText('Target sheet')
    await userEvent.selectOptions(select, 'Sprint 1')

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.targetSheet).toBe('Sprint 1')
    })
  })

  it('shows load error when listSheets rejects', async () => {
    vi.mocked(listSheets).mockRejectedValue(new Error('Network error'))
    useAuthStore.setState({ isAuthenticated: true })
    setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx' })

    await userEvent.click(await screen.findByRole('button', { name: /load sheets/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
  })

  it('shows already-saved sheet when no sheets loaded yet', async () => {
    setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx', targetSheet: 'My Sheet' })
    expect(await screen.findByText(/✓ My Sheet/)).toBeInTheDocument()
  })
})
