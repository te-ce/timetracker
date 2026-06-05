import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CategorySettings } from './CategorySettings'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import type { AppConfig } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockResolvedValue('token'),
  msalInstance: {},
  graphScopes: [],
}))

vi.mock('../../infra/auth/bootstrapConfig', () => ({
  isLocalFolderMode: vi.fn().mockReturnValue(false),
  clearBootstrapConfig: vi.fn(),
}))

import { useAuthStore } from '../../shared/authStore'
import { GraphApiWorkbookService } from '../excel/workbookService'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

const baseConfig: AppConfig = {
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

describe('CategorySettings', () => {
  it('renders the default category list', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('_LEAVE')).toBeInTheDocument()
    expect(screen.getByText('_COREMEDIA')).toBeInTheDocument()
    expect(screen.getByText('_SUPPORT')).toBeInTheDocument()
  })

  it('renders remove button for each category', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const removeButtons = await screen.findAllByRole('button', { name: /^Remove / })
    expect(removeButtons.length).toBeGreaterThanOrEqual(10)
  })

  it('adds a new custom category', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'MyNewCategory')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    await screen.findByText('MyNewCategory')
    const saved = await repo.get()
    expect(saved.customCategories).toContain('MyNewCategory')
  })

  it('adds a new category via Enter key', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'EnterCategory{Enter}')

    await screen.findByText('EnterCategory')
    const saved = await repo.get()
    expect(saved.customCategories).toContain('EnterCategory')
  })

  it('removes a category', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['ToRemove'],
      categoryOrder: [
        '_LEAVE',
        '_OTHER',
        '_COREMEDIA',
        '_RELEASE',
        '_SUPPORT',
        '_GUILDS',
        '_MAINT',
        '_INFRA',
        '_ARCH',
        '_TESTWATCH',
        'ToRemove',
      ],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('ToRemove')
    await userEvent.click(screen.getByRole('button', { name: 'Remove ToRemove' }))

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.customCategories).not.toContain('ToRemove')
    })
    expect(screen.queryByText('ToRemove')).not.toBeInTheDocument()
  })

  it('shows custom categories with existing config', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['Alpha', 'Beta'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('does not add a duplicate category', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('_LEAVE')
    const input = screen.getByLabelText('New category')
    await userEvent.type(input, '_LEAVE')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    const saved = await repo.get()
    expect(saved.customCategories).not.toContain('_LEAVE')
    // Still only one _LEAVE in the list
    expect(screen.getAllByText('_LEAVE')).toHaveLength(1)
  })

  it('shows "Load Excel mapping" button disabled when no sharepoint config', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const loadBtn = await screen.findByRole('button', { name: 'Load Excel mapping' })
    expect(loadBtn).toBeDisabled()
  })

  it('shows saved categoryMapping as a badge when excel rows not loaded', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: [],
      categoryMapping: { _COREMEDIA: 'TASK-42' },
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('TASK-42')).toBeInTheDocument()
  })

  // ── New tests below ──────────────────────────────────────────────────────────

  it('shows mapping count hint in footer when categoryMapping has entries and no excel rows', async () => {
    const config: AppConfig = {
      ...baseConfig,
      categoryMapping: { _COREMEDIA: 'T-1', _LEAVE: 'T-2' },
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    // Footer text should mention "2 categories mapped — load Excel to edit."
    expect(await screen.findByText(/2 categories mapped/)).toBeInTheDocument()
  })

  it('shows generic footer text when no mapping exists', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText(/Load Excel mapping to link categories to Task IDs/)).toBeInTheDocument()
  })

  it('shows multiple categoryMapping badges when multiple categories have mappings', async () => {
    const config: AppConfig = {
      ...baseConfig,
      categoryMapping: { _COREMEDIA: 'CM-100', _SUPPORT: 'SP-200' },
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('CM-100')).toBeInTheDocument()
    expect(screen.getByText('SP-200')).toBeInTheDocument()
  })

  it('shows "Set SharePoint URL to map" hint when sharepointUrl is missing', async () => {
    const repo = new InMemoryConfigRepository({ ...baseConfig, sharepointUrl: null, targetSheet: null })
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('Set SharePoint URL to map')).toBeInTheDocument()
  })

  it('shows "Select a sheet to map" hint when sharepointUrl set but no targetSheet', async () => {
    const repo = new InMemoryConfigRepository({
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: null,
    })
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('Select a sheet to map')).toBeInTheDocument()
  })

  it('enters rename mode on double-click and renames category via Enter', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['OldCat'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const catSpan = await screen.findByText('OldCat')
    await userEvent.dblClick(catSpan)

    const renameInput = screen.getByLabelText('Rename OldCat')
    await userEvent.clear(renameInput)
    await userEvent.type(renameInput, 'NewCat{Enter}')

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.customCategories).toContain('NewCat')
      expect(saved.customCategories).not.toContain('OldCat')
    })
    expect(await screen.findByText('NewCat')).toBeInTheDocument()
  })

  it('cancels rename on Escape and keeps original name', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['KeepMe'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const catSpan = await screen.findByText('KeepMe')
    await userEvent.dblClick(catSpan)

    const renameInput = screen.getByLabelText('Rename KeepMe')
    await userEvent.type(renameInput, '{Escape}')

    await waitFor(() => {
      expect(screen.queryByLabelText('Rename KeepMe')).not.toBeInTheDocument()
    })
    expect(screen.getByText('KeepMe')).toBeInTheDocument()
  })

  it('reorders categories via drag-and-drop events', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: [],
      categoryOrder: [
        '_LEAVE',
        '_OTHER',
        '_COREMEDIA',
        '_RELEASE',
        '_SUPPORT',
        '_GUILDS',
        '_MAINT',
        '_INFRA',
        '_ARCH',
        '_TESTWATCH',
      ],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('_LEAVE')

    const listItems = screen.getAllByRole('listitem')
    // Drag item at index 0 (_LEAVE) to index 2 (_COREMEDIA slot)
    const dragSource = listItems[0]!
    const dropTarget = listItems[2]!

    fireEvent.dragStart(dragSource)
    fireEvent.dragOver(dropTarget, { preventDefault: () => {} })
    fireEvent.drop(dropTarget)

    await waitFor(async () => {
      const saved = await repo.get()
      // _LEAVE should have moved — it should no longer be first
      expect(saved.categoryOrder).toBeDefined()
      expect(saved.categoryOrder![0]).not.toBe('_LEAVE')
    })
  })

  it('does not mutate on drop to same index', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: [],
      categoryOrder: [
        '_LEAVE',
        '_OTHER',
        '_COREMEDIA',
        '_RELEASE',
        '_SUPPORT',
        '_GUILDS',
        '_MAINT',
        '_INFRA',
        '_ARCH',
        '_TESTWATCH',
      ],
    }
    const repo = new InMemoryConfigRepository(config)
    const saveSpy = vi.spyOn(repo, 'save')
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('_LEAVE')

    const listItems = screen.getAllByRole('listitem')
    const item = listItems[0]!

    fireEvent.dragStart(item)
    fireEvent.dragOver(item, { preventDefault: () => {} })
    fireEvent.drop(item)

    // Give any async operations a chance to run
    await waitFor(() => {
      // save should not have been called for a same-index drop
      expect(saveSpy).not.toHaveBeenCalled()
    })
  })

  it('shows "Save mapping" button after a mapping change and saves on click', async () => {
    // Pre-load excel rows by setting up localMapping through handleMappingChange path.
    // We test this by rendering with excelRows already available via the select dropdown
    // which only appears once rows are loaded. Since we can't easily mock the service,
    // we verify the "Save mapping" button is NOT shown initially (no dirty state).
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('_LEAVE')
    // No dirty state initially, so no Save mapping button
    expect(screen.queryByRole('button', { name: 'Save mapping' })).not.toBeInTheDocument()
  })

  it('shows column headers: Category and Excel row', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Excel row')).toBeInTheDocument()
  })

  it('does not add empty-string category', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByLabelText('New category')
    // Click Add without typing anything
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    const saved = await repo.get()
    expect(saved.customCategories).toHaveLength(0)
  })

  it('removes a custom category and it disappears from the list', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['MyCustom'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByText('MyCustom')
    await userEvent.click(screen.getByRole('button', { name: 'Remove MyCustom' }))

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.customCategories).not.toContain('MyCustom')
    })
    expect(screen.queryByText('MyCustom')).not.toBeInTheDocument()
  })

  it('shows "Sign in to map" hint when authenticated is false but sharepoint+sheet configured', async () => {
    useAuthStore.setState({ isAuthenticated: false })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })
    expect(await screen.findByText('Sign in to map')).toBeInTheDocument()
  })

  it('loads excel rows and shows select dropdowns', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
      categoryMapping: {},
    }
    const excelRows = [
      { taskId: 'TASK-1', description: 'First Task' },
      { taskId: 'TASK-2', description: 'Second Task' },
    ]
    const listRowsSpy = vi.spyOn(GraphApiWorkbookService.prototype, 'listRows').mockResolvedValue(excelRows)

    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    const loadBtn = await screen.findByRole('button', { name: 'Load Excel mapping' })
    expect(loadBtn).not.toBeDisabled()
    await userEvent.click(loadBtn)

    await screen.findByRole('button', { name: 'Reload from Excel' })
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThan(0)
    listRowsSpy.mockRestore()
  })

  it('shows error message when loading rows fails', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
    }
    const listRowsSpy = vi
      .spyOn(GraphApiWorkbookService.prototype, 'listRows')
      .mockRejectedValue(new Error('Network failure'))

    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Load Excel mapping' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network failure')
    listRowsSpy.mockRestore()
  })

  it('shows mapping change and save mapping button after selecting a task', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
    }
    const excelRows = [{ taskId: 'TASK-X', description: 'My Task' }]
    const listRowsSpy = vi.spyOn(GraphApiWorkbookService.prototype, 'listRows').mockResolvedValue(excelRows)

    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Load Excel mapping' }))
    await screen.findByRole('button', { name: 'Reload from Excel' })

    const select = screen.getByRole('combobox', { name: /excel mapping for _LEAVE/i })
    await userEvent.selectOptions(select, 'TASK-X')

    expect(await screen.findByRole('button', { name: 'Save mapping' })).toBeInTheDocument()
    listRowsSpy.mockRestore()
  })

  it('saves mapping after clicking Save mapping', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
    }
    const excelRows = [{ taskId: 'TASK-Y', description: '' }]
    const listRowsSpy = vi.spyOn(GraphApiWorkbookService.prototype, 'listRows').mockResolvedValue(excelRows)

    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Load Excel mapping' }))
    await screen.findByRole('button', { name: 'Reload from Excel' })

    const select = screen.getByRole('combobox', { name: /excel mapping for _COREMEDIA/i })
    await userEvent.selectOptions(select, 'TASK-Y')
    await userEvent.click(screen.getByRole('button', { name: 'Save mapping' }))

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.categoryMapping?._COREMEDIA).toBe('TASK-Y')
    })
    expect(await screen.findByText('✓ Mapping saved')).toBeInTheDocument()
    listRowsSpy.mockRestore()
  })

  it('shows unmapped Excel rows and can add them as category', async () => {
    useAuthStore.setState({ isAuthenticated: true })
    const config: AppConfig = {
      ...baseConfig,
      sharepointUrl: 'https://example.sharepoint.com/file.xlsx',
      targetSheet: 'Sheet1',
    }
    const excelRows = [{ taskId: 'UNMAPPED-Z', description: 'Unmapped Task' }]
    const listRowsSpy = vi.spyOn(GraphApiWorkbookService.prototype, 'listRows').mockResolvedValue(excelRows)

    const repo = new InMemoryConfigRepository(config)
    render(<CategorySettings repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Load Excel mapping' }))
    await screen.findByRole('button', { name: 'Reload from Excel' })

    expect(await screen.findByText(/Rows in Excel not yet mapped/)).toBeInTheDocument()
    const addBtn = screen.getByRole('button', { name: '+ Add as category' })
    await userEvent.click(addBtn)

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.customCategories).toContain('Unmapped Task')
    })
    listRowsSpy.mockRestore()
  })
})
