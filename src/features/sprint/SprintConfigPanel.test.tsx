import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { SprintConfigPanel } from './SprintConfigPanel'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

function setup(overrides: { sprintStartDate?: string; sprintLengthDays?: number } = {}) {
  const repo = new InMemoryConfigRepository({
    ...DEFAULT_APP_CONFIG,
    sprintLengthDays: overrides.sprintLengthDays ?? 14,
    sprintStartDate: overrides.sprintStartDate ?? '2024-01-01',
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onConfigChanged = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <SprintConfigPanel repository={repo} onConfigChanged={onConfigChanged} />
    </QueryClientProvider>,
  )
  return { repo, onConfigChanged }
}

describe('SprintConfigPanel', () => {
  it('displays current sprint start date and length', async () => {
    setup({ sprintStartDate: '2024-01-01', sprintLengthDays: 14 })
    expect(await screen.findByDisplayValue('2024-01-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('14')).toBeInTheDocument()
  })

  it('saves updated sprint start date', async () => {
    const { repo, onConfigChanged } = setup({ sprintStartDate: '2024-01-01' })
    await screen.findByDisplayValue('2024-01-01')
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-02-01' } })
    await waitFor(() => expect(screen.getByDisplayValue('2024-02-01')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintStartDate).toBe('2024-02-01')
    })
    expect(onConfigChanged).toHaveBeenCalled()
  })

  it('saves updated sprint length', async () => {
    const { repo, onConfigChanged } = setup({ sprintLengthDays: 14 })
    await screen.findByDisplayValue('14')
    fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '7' } })
    await waitFor(() => expect(screen.getByDisplayValue('7')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintLengthDays).toBe(7)
    })
    expect(onConfigChanged).toHaveBeenCalled()
  })

  it('saves when Enter is pressed in the start date input', async () => {
    const { repo } = setup({ sprintStartDate: '2024-01-01' })
    await screen.findByDisplayValue('2024-01-01')
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-03-01' } })
    fireEvent.keyDown(screen.getByLabelText(/start date/i), { key: 'Enter' })

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintStartDate).toBe('2024-03-01')
    })
  })

  it('saves when Enter is pressed in the length input', async () => {
    const { repo } = setup({ sprintLengthDays: 14 })
    await screen.findByDisplayValue('14')
    fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '21' } })
    fireEvent.keyDown(screen.getByLabelText(/length/i), { key: 'Enter' })

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintLengthDays).toBe(21)
    })
  })

  it('saves null start date when the field is cleared', async () => {
    const { repo } = setup({ sprintStartDate: '2024-01-01' })
    await screen.findByDisplayValue('2024-01-01')
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '' } })
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintStartDate).toBeNull()
    })
  })

  it('works without onConfigChanged prop', async () => {
    const repo = new InMemoryConfigRepository({
      ...DEFAULT_APP_CONFIG,
      sprintLengthDays: 14,
      sprintStartDate: '2024-01-01',
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <SprintConfigPanel repository={repo} />
      </QueryClientProvider>,
    )
    await screen.findByDisplayValue('2024-01-01')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintStartDate).toBe('2024-01-01')
    })
  })
})
