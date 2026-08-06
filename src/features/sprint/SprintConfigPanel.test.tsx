import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory'
import { SprintConfigPanel } from './SprintConfigPanel'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { SheetExistsError } from '../excel'

function setup(
  overrides: {
    sprintStartDate?: string
    sprintLengthDays?: number
    sprintRoundingStep?: number
    sprintRoundingMode?: 'nearest' | 'up' | 'down'
    exportStatus?: 'pending' | 'exported'
    exportReady?: boolean
    onExport?: (overwrite: boolean) => Promise<void>
  } = {},
) {
  const repo = new InMemoryConfigRepository({
    ...DEFAULT_APP_CONFIG,
    sprintLengthDays: overrides.sprintLengthDays ?? 14,
    sprintStartDate: overrides.sprintStartDate ?? '2024-01-01',
    sprintRoundingStep: overrides.sprintRoundingStep ?? 0,
    sprintRoundingMode: overrides.sprintRoundingMode ?? 'nearest',
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onConfigChanged = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <SprintConfigPanel
        repository={repo}
        onConfigChanged={onConfigChanged}
        exportStatus={overrides.exportStatus}
        exportReady={overrides.exportReady}
        onExport={overrides.onExport}
      />
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

  it('hides the Save button when there are no unsaved changes', async () => {
    setup({ sprintStartDate: '2024-01-01' })
    await screen.findByDisplayValue('2024-01-01')
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('shows the Save button once a field changes, then hides it again after saving', async () => {
    setup({ sprintStartDate: '2024-01-01' })
    await screen.findByDisplayValue('2024-01-01')
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-02-01' } })
    await screen.findByRole('button', { name: /save/i })

    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument())
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
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-02-01' } })
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(async () => {
      const config = await repo.get()
      expect(config.sprintStartDate).toBe('2024-02-01')
    })
  })

  describe('rounding', () => {
    it('defaults the rounding step to Off and hides the mode selector', async () => {
      setup()
      await screen.findByDisplayValue('2024-01-01')
      expect(screen.getByLabelText(/rounding step/i)).toHaveValue('0')
      expect(screen.queryByLabelText(/rounding mode/i)).not.toBeInTheDocument()
    })

    it('shows the mode selector once a step is set and saves both fields', async () => {
      const { repo } = setup()
      await screen.findByDisplayValue('2024-01-01')

      await userEvent.selectOptions(screen.getByLabelText(/rounding step/i), '0.5')
      await userEvent.selectOptions(screen.getByLabelText(/rounding mode/i), 'up')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))

      await waitFor(async () => {
        const config = await repo.get()
        expect(config.sprintRoundingStep).toBe(0.5)
        expect(config.sprintRoundingMode).toBe('up')
      })
    })

    it('loads a previously saved rounding step and mode', async () => {
      setup({ sprintRoundingStep: 0.25, sprintRoundingMode: 'down' })
      await screen.findByDisplayValue('2024-01-01')
      expect(screen.getByLabelText(/rounding step/i)).toHaveValue('0.25')
      expect(screen.getByLabelText(/rounding mode/i)).toHaveValue('down')
    })
  })

  describe('export', () => {
    it('does not show an export button when onExport is not provided', async () => {
      setup()
      await screen.findByDisplayValue('2024-01-01')
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    })

    it('shows the export button after the Save button when onExport is provided', async () => {
      setup({ onExport: vi.fn().mockResolvedValue(undefined) })
      await screen.findByDisplayValue('2024-01-01')
      fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2024-02-01' } })
      const buttons = screen.getAllByRole('button')
      const saveIndex = buttons.findIndex((b) => /save/i.test(b.textContent))
      const exportIndex = buttons.findIndex((b) => /^export$/i.test(b.textContent))
      expect(exportIndex).toBeGreaterThan(saveIndex)
    })

    it('calls onExport when the export button is clicked', async () => {
      const onExport = vi.fn().mockResolvedValue(undefined)
      setup({ onExport })
      await screen.findByDisplayValue('2024-01-01')
      await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
      expect(onExport).toHaveBeenCalledOnce()
    })

    it('keeps the export button enabled even when exportReady is false', async () => {
      setup({ onExport: vi.fn().mockResolvedValue(undefined), exportReady: false })
      await screen.findByDisplayValue('2024-01-01')
      expect(screen.getByRole('button', { name: /^export$/i })).toBeEnabled()
    })

    it('shows the ExportStatus badge', async () => {
      setup({ onExport: vi.fn().mockResolvedValue(undefined), exportStatus: 'exported' })
      await screen.findByDisplayValue('2024-01-01')
      expect(screen.getByText(/exported/i)).toBeInTheDocument()
    })

    it('shows an error message when export fails', async () => {
      const onExport = vi.fn().mockRejectedValue(new Error('Network error'))
      setup({ onExport })
      await screen.findByDisplayValue('2024-01-01')
      await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
    })

    it('switches to "Export and overwrite" when the archive sheet already exists, then re-exports with overwrite', async () => {
      const onExport = vi
        .fn<(overwrite: boolean) => Promise<void>>()
        .mockRejectedValueOnce(new SheetExistsError('Sprint 3'))
        .mockResolvedValueOnce(undefined)
      setup({ onExport })
      await screen.findByDisplayValue('2024-01-01')

      await userEvent.click(screen.getByRole('button', { name: /^export$/i }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Worksheet "Sprint 3" already exists')
      expect(onExport).toHaveBeenNthCalledWith(1, false)

      const confirmBtn = screen.getByRole('button', { name: /export and overwrite/i })
      await userEvent.click(confirmBtn)
      expect(onExport).toHaveBeenNthCalledWith(2, true)

      expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /export and overwrite/i })).not.toBeInTheDocument()
    })
  })
})
