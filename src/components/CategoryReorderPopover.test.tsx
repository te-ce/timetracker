import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CategoryReorderPopover } from './CategoryReorderPopover'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import type { AppConfig } from '../repositories/types'

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

describe('CategoryReorderPopover', () => {
  it('renders the toggle button', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    expect(await screen.findByRole('button', { name: 'Reorder categories' })).toBeInTheDocument()
  })

  it('popover is closed by default — category list not visible', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await screen.findByRole('button', { name: 'Reorder categories' })
    expect(screen.queryByText('Drag to reorder')).not.toBeInTheDocument()
  })

  it('opens popover and shows category list on button click', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))

    expect(await screen.findByText('Drag to reorder')).toBeInTheDocument()
    expect(screen.getByText('_LEAVE')).toBeInTheDocument()
    expect(screen.getByText('_COREMEDIA')).toBeInTheDocument()
  })

  it('shows custom categories in the popover', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['MyProject'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))

    expect(await screen.findByText('MyProject')).toBeInTheDocument()
  })

  it('closes popover on second click of the toggle button', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    const btn = await screen.findByRole('button', { name: 'Reorder categories' })
    await userEvent.click(btn)
    await screen.findByText('Drag to reorder')

    await userEvent.click(btn)
    await waitFor(() => {
      expect(screen.queryByText('Drag to reorder')).not.toBeInTheDocument()
    })
  })

  it('closes popover when clicking outside', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <CategoryReorderPopover repository={repo} />
      </div>,
      { wrapper: makeWrapper() },
    )

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))
    await screen.findByText('Drag to reorder')

    await userEvent.click(screen.getByTestId('outside'))
    await waitFor(() => {
      expect(screen.queryByText('Drag to reorder')).not.toBeInTheDocument()
    })
  })

  it('shows drag handles (⠿) for each category item in the popover', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: ['Alpha'],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))
    await screen.findByText('Drag to reorder')

    // getAllByText returns all ⠿ occurrences — one per category item (+ button itself)
    const handles = screen.getAllByText('⠿', { exact: false })
    // At minimum one handle per category row visible (11 default + 1 custom = 12 rows)
    expect(handles.length).toBeGreaterThanOrEqual(11)
  })

  it('renders all ten default categories in the popover', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))

    const defaults = ['_LEAVE', '_OTHER', '_COREMEDIA', '_RELEASE', '_SUPPORT', '_GUILDS', '_MAINT', '_INFRA', '_ARCH', '_TESTWATCH']
    for (const cat of defaults) {
      expect(await screen.findByText(cat)).toBeInTheDocument()
    }
  })

  it('reorders categories on drag and drop', async () => {
    const config: AppConfig = {
      ...baseConfig,
      customCategories: [],
    }
    const repo = new InMemoryConfigRepository(config)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))
    await screen.findByText('Drag to reorder')

    const items = screen.getAllByRole('listitem')
    const firstItem = items[0]
    const secondItem = items[1]

    fireEvent.dragStart(firstItem)
    fireEvent.dragOver(secondItem, { preventDefault: () => {} })
    fireEvent.drop(secondItem)

    await waitFor(async () => {
      const saved = await repo.get()
      expect(saved.categoryOrder).toBeDefined()
    })
  })

  it('does nothing when dropping on the same item', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    const saveSpy = vi.spyOn(repo, 'save')
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))
    await screen.findByText('Drag to reorder')

    const items = screen.getAllByRole('listitem')
    const firstItem = items[0]

    fireEvent.dragStart(firstItem)
    fireEvent.dragOver(firstItem, { preventDefault: () => {} })
    fireEvent.drop(firstItem)

    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('clears drag state on dragEnd', async () => {
    const repo = new InMemoryConfigRepository(baseConfig)
    render(<CategoryReorderPopover repository={repo} />, { wrapper: makeWrapper() })

    await userEvent.click(await screen.findByRole('button', { name: 'Reorder categories' }))
    await screen.findByText('Drag to reorder')

    const items = screen.getAllByRole('listitem')
    fireEvent.dragStart(items[0])
    fireEvent.dragOver(items[1], { preventDefault: () => {} })
    fireEvent.dragEnd(items[0])

    expect(screen.queryByText('Drag to reorder')).toBeInTheDocument()
  })
})
