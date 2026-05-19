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
})
