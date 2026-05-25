import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryConfigRepository } from '../repositories/in-memory'
import { CustomCategorySettings } from './CustomCategorySettings'
import type { AppConfig } from '../repositories/types'

const baseConfig: AppConfig = {
  sollstunden: 8,
  autoCategory: null,
  federalState: null,
  sprintLengthDays: 14,
  sprintStartDate: null,
  customCategories: [],
}

function setup(config: AppConfig = baseConfig) {
  const repo = new InMemoryConfigRepository(config)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <CustomCategorySettings repository={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

describe('CustomCategorySettings', () => {
  it('displays existing custom categories', async () => {
    setup({ ...baseConfig, customCategories: ['Investment A', 'Project X'] })
    expect(await screen.findByText('Investment A')).toBeInTheDocument()
    expect(screen.getByText('Project X')).toBeInTheDocument()
    // Also shows default categories
    expect(screen.getByText('_COREMEDIA')).toBeInTheDocument()
  })

  it('adds a new custom category on submit', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'My Project')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.customCategories).toContain('My Project')
    })
  })

  it('removes a category when delete button clicked', async () => {
    const { repo } = setup({ ...baseConfig, customCategories: ['To Remove'] })
    const removeBtn = await screen.findByRole('button', { name: /remove To Remove/i })
    await userEvent.click(removeBtn)

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.customCategories).not.toContain('To Remove')
    })
  })

  it('does not add duplicate category', async () => {
    setup({ ...baseConfig, customCategories: ['Existing'] })
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'Existing')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    // Should still only have one instance
    const items = await screen.findAllByText('Existing')
    expect(items).toHaveLength(1)
  })

  it('clears input after successful add', async () => {
    setup()
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'New Cat')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('adds a category via Enter key', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, 'EnteredCat{Enter}')

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.customCategories).toContain('EnteredCat')
    })
    expect(await screen.findByText('EnteredCat')).toBeInTheDocument()
  })

  it('does not add whitespace-only input', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, '   ')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    const config = await repo.get()
    expect(config.customCategories).toHaveLength(0)
  })

  it('does not add a duplicate of a default category', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('New category')
    await userEvent.type(input, '_LEAVE')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))

    const config = await repo.get()
    expect(config.customCategories).not.toContain('_LEAVE')
    expect(screen.getAllByText('_LEAVE')).toHaveLength(1)
  })

  it('removes a custom category and it disappears from the list', async () => {
    setup({ ...baseConfig, customCategories: ['Alpha', 'Beta'] })
    await screen.findByText('Alpha')

    await userEvent.click(screen.getByRole('button', { name: 'Remove Alpha' }))

    await waitFor(() => {
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('enters edit mode on double-click and renames via Enter', async () => {
    const { repo } = setup({ ...baseConfig, customCategories: ['OldName'] })
    const catSpan = await screen.findByText('OldName')

    await userEvent.dblClick(catSpan)

    const renameInput = screen.getByLabelText('Rename OldName')
    await userEvent.clear(renameInput)
    await userEvent.type(renameInput, 'NewName{Enter}')

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.customCategories).toContain('NewName')
      expect(config.customCategories).not.toContain('OldName')
    })
    expect(await screen.findByText('NewName')).toBeInTheDocument()
  })

  it('cancels rename on Escape key', async () => {
    setup({ ...baseConfig, customCategories: ['KeepMe'] })
    const catSpan = await screen.findByText('KeepMe')

    await userEvent.dblClick(catSpan)
    const renameInput = screen.getByLabelText('Rename KeepMe')
    await userEvent.clear(renameInput)
    await userEvent.type(renameInput, 'SomethingElse{Escape}')

    await waitFor(() => {
      expect(screen.queryByLabelText('Rename KeepMe')).not.toBeInTheDocument()
    })
    expect(screen.getByText('KeepMe')).toBeInTheDocument()
  })

  it('ignores rename to same name and exits edit mode', async () => {
    const { repo } = setup({ ...baseConfig, customCategories: ['SameName'] })
    const catSpan = await screen.findByText('SameName')

    await userEvent.dblClick(catSpan)
    const renameInput = screen.getByLabelText('Rename SameName')
    // Blur without change — rename to same value
    renameInput.blur()

    await waitFor(() => {
      expect(screen.queryByLabelText('Rename SameName')).not.toBeInTheDocument()
    })
    const config = await repo.get()
    expect(config.customCategories).toContain('SameName')
  })

  it('shows all default categories even with no custom ones', async () => {
    setup()
    expect(await screen.findByText('_LEAVE')).toBeInTheDocument()
    expect(screen.getByText('_OTHER')).toBeInTheDocument()
    expect(screen.getByText('_COREMEDIA')).toBeInTheDocument()
    expect(screen.getByText('_SUPPORT')).toBeInTheDocument()
    expect(screen.getByText('_TESTWATCH')).toBeInTheDocument()
  })
})
