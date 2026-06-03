import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ExcelMappingSettings } from './ExcelMappingSettings'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import type { AppConfig } from '../repositories/types'
import { useAuthStore } from '../stores/authStore'

// isLocalFolderMode() is read at module-evaluation time in ExcelMappingSettings.
// Mock the whole module so we can control which branch the component uses.
vi.mock('../auth/bootstrapConfig', () => ({
  isLocalFolderMode: vi.fn().mockReturnValue(false),
}))

// Mock the workbook service classes.  The component calls `new GraphApiWorkbookService(…)`
// and `new LocalFolderWorkbookService(…)`, so each mock must be a proper constructor.
vi.mock('../services/workbookService', () => {
  // These need to be real constructor functions (class syntax or function).
  const listRows = vi.fn()
  class GraphApiWorkbookService {
    listRows = listRows
  }
  class LocalFolderWorkbookService {
    listRows = listRows
  }
  // Expose `listRows` on the module so tests can control it.
  return { GraphApiWorkbookService, LocalFolderWorkbookService, __listRows: listRows }
})

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
}))

import { isLocalFolderMode } from '../auth/bootstrapConfig'
// Grab the shared listRows spy after the mock is in place.
import * as workbookServiceMod from '../services/workbookService'

function resolvedListRows() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return (workbookServiceMod as unknown as { __listRows: ReturnType<typeof vi.fn> }).__listRows
}

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
      <ExcelMappingSettings repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

beforeEach(() => {
  vi.mocked(isLocalFolderMode).mockReturnValue(false)
  useAuthStore.setState({ isAuthenticated: false })
  resolvedListRows().mockReset()
})

describe('ExcelMappingSettings', () => {
  it('renders heading and description', async () => {
    setup()
    expect(await screen.findByText('Category → Excel Mapping')).toBeInTheDocument()
    expect(screen.getByText(/map each app category/i)).toBeInTheDocument()
  })

  it('shows "Set a SharePoint URL first" when no SharePoint url configured', async () => {
    setup({ sharepointUrl: null, targetSheet: null })
    expect(await screen.findByText(/set a sharepoint url first/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /load rows from excel sheet/i })).toBeDisabled()
  })

  it('shows "Select a target sheet first" when url is set but no sheet', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    setup({ sharepointUrl: 'https://example.sharepoint.com/file.xlsx', targetSheet: null })
    expect(await screen.findByText(/select a target sheet first/i)).toBeInTheDocument()
  })

  it('loads rows and shows category mapping selects', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    resolvedListRows().mockResolvedValue([
      { taskId: 'TASK-001', description: 'Core work' },
      { taskId: 'TASK-002', description: 'Support' },
    ])
    setup({ sharepointUrl: 'https://sp.example.com/file.xlsx', targetSheet: 'Sprint 1' })

    await userEvent.click(await screen.findByRole('button', { name: /load rows from excel sheet/i }))

    const select = await screen.findByLabelText(/map _COREMEDIA to task id/i)
    expect(select).toBeInTheDocument()
    // Each category row renders the same option list; verify within one select
    if (!(select instanceof HTMLSelectElement)) throw new Error('Expected HTMLSelectElement')
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toContain('TASK-001')
  })

  it('saves mapping when "Save mapping" is clicked', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    resolvedListRows().mockResolvedValue([{ taskId: 'TASK-001', description: 'Core work' }])
    const { repo } = setup({ sharepointUrl: 'https://sp.example.com/file.xlsx', targetSheet: 'Sprint 1' })

    await userEvent.click(await screen.findByRole('button', { name: /load rows from excel sheet/i }))

    const select = await screen.findByLabelText(/map _COREMEDIA to task id/i)
    await userEvent.selectOptions(select, 'TASK-001')

    await userEvent.click(screen.getByRole('button', { name: /save mapping/i }))

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.categoryMapping?.['_COREMEDIA']).toBe('TASK-001')
    })
  })

  it('shows load error when service rejects', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    resolvedListRows().mockRejectedValue(new Error('Graph API error'))
    setup({ sharepointUrl: 'https://sp.example.com/file.xlsx', targetSheet: 'Sprint 1' })

    await userEvent.click(await screen.findByRole('button', { name: /load rows from excel sheet/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Graph API error')
  })

  it('shows summary of already-saved mappings before loading rows', async () => {
    setup({
      sharepointUrl: 'https://sp.example.com/file.xlsx',
      targetSheet: 'Sprint 1',
      categoryMapping: { _COREMEDIA: 'TASK-001', _SUPPORT: 'TASK-002' },
    })
    expect(await screen.findByText(/2 categories mapped/i)).toBeInTheDocument()
  })
})
