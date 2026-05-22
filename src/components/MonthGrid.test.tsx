import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  InMemoryTimeEntryRepository,
  InMemoryWorkPeriodRepository,
  InMemoryDayConfirmationRepository,
  InMemoryDayTypeOverrideRepository,
  InMemoryWorkLocationRepository,
} from '../repositories/in-memory'
import { MonthGrid } from './MonthGrid'
import { DEFAULT_CATEGORIES } from '../repositories/types'
import type { TimeEntry, WorkPeriod } from '../repositories/types'

function setup(opts: { entries?: TimeEntry[]; windows?: WorkPeriod[] } = {}) {
  const entryRepo = new InMemoryTimeEntryRepository(opts.entries ?? [])
  const windowRepo = new InMemoryWorkPeriodRepository(opts.windows ?? [])
  const confirmRepo = new InMemoryDayConfirmationRepository()
  const dayTypeRepo = new InMemoryDayTypeOverrideRepository()
  const locationRepo = new InMemoryWorkLocationRepository()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MonthGrid
        year={2026}
        month={5}
        timeEntryRepository={entryRepo}
        workPeriodRepository={windowRepo}
        dayConfirmationRepository={confirmRepo}
        dayTypeOverrideRepository={dayTypeRepo}
        workLocationRepository={locationRepo}
        autoCategory="_COREMEDIA"
      />
    </QueryClientProvider>,
  )

  return { entryRepo, windowRepo }
}

describe('MonthGrid', () => {
  it('renders a row for each day and column headers for categories', async () => {
    setup()

    // Column headers
    for (const cat of DEFAULT_CATEGORIES) {
      expect(await screen.findByRole('columnheader', { name: cat })).toBeInTheDocument()
    }

    // WorkedHours column
    expect(screen.getByRole('columnheader', { name: /worked/i })).toBeInTheDocument()

    // 31 day rows for May
    const rows = screen.getAllByRole('row')
    // header row + 31 data rows + 1 footer total row
    expect(rows.length).toBe(33)
  })

  it('displays workedHours computed from WorkPeriods', async () => {
    setup({
      windows: [
        { id: 'w1', date: '2026-05-01', start: '09:00', end: '12:00' },
        { id: 'w2', date: '2026-05-01', start: '13:00', end: '17:00' },
      ],
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    await waitFor(() => {
      expect(within(row).getByTestId('worked-hours')).toHaveTextContent('7')
    })
  })

  it('saves entry when user types value and blurs cell', async () => {
    const { entryRepo } = setup({
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    const cell = within(row).getByLabelText('Hours for _SUPPORT on 2026-05-01')
    await userEvent.type(cell, '3')
    await userEvent.tab()

    await waitFor(async () => {
      const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
      expect(entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(3)
    })
  })

  it('shows auto-category hours in the category column', async () => {
    setup({
      entries: [{ id: '1', date: '2026-05-01', category: '_SUPPORT', hours: 3 }],
      windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    await waitFor(() => {
      // Auto category (_COREMEDIA) should show 5 hours (8 worked - 3 manual)
      expect(within(row).getByTestId('auto-category')).toHaveTextContent('5')
    })
  })

  it('visually mutes weekend rows', async () => {
    setup()

    // May 2, 2026 is Saturday
    const row = await screen.findByRole('row', { name: /2026-05-02/ })
    expect(row).toHaveClass('opacity-50')
  })

  it('shows total worked hours in footer', async () => {
    setup({
      windows: [
        { id: 'w1', date: '2026-05-01', start: '09:00', end: '12:00' },
        { id: 'w2', date: '2026-05-01', start: '13:00', end: '17:00' },
        { id: 'w3', date: '2026-05-02', start: '08:00', end: '12:00' },
      ],
    })

    await waitFor(() => {
      // 7h (day 1) + 4h (day 2) = 11h
      expect(screen.getByTestId('total-worked')).toHaveTextContent('11.00')
    })
  })

  describe('column rename', () => {
    function setupWithRename(onRename: (oldName: string, newName: string) => void) {
      const entryRepo = new InMemoryTimeEntryRepository([])
      const windowRepo = new InMemoryWorkPeriodRepository([])
      const confirmRepo = new InMemoryDayConfirmationRepository()
      const dayTypeRepo = new InMemoryDayTypeOverrideRepository()
      const locationRepo = new InMemoryWorkLocationRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <MonthGrid
            year={2026}
            month={5}
            timeEntryRepository={entryRepo}
            workPeriodRepository={windowRepo}
            dayConfirmationRepository={confirmRepo}
            dayTypeOverrideRepository={dayTypeRepo}
            workLocationRepository={locationRepo}
            autoCategory="_COREMEDIA"
            onCategoryRename={onRename}
          />
        </QueryClientProvider>,
      )
      return { entryRepo }
    }

    it('double-clicking a column header shows an edit input', async () => {
      const onRename = vi.fn() as (oldName: string, newName: string) => void
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      expect(screen.getByDisplayValue('_SUPPORT')).toBeInTheDocument()
    })

    it('pressing Enter commits the rename', async () => {
      const onRename = vi.fn() as (oldName: string, newName: string) => void
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      const input = screen.getByDisplayValue('_SUPPORT')
      await userEvent.clear(input)
      await userEvent.type(input, 'Support{Enter}')
      expect(onRename).toHaveBeenCalledWith('_SUPPORT', 'Support')
    })

    it('pressing Escape cancels without calling onCategoryRename', async () => {
      const onRename = vi.fn() as (oldName: string, newName: string) => void
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      await userEvent.keyboard('{Escape}')
      expect(onRename).not.toHaveBeenCalled()
      expect(screen.queryByDisplayValue('_SUPPORT')).not.toBeInTheDocument()
    })

    it('does not call onCategoryRename when name is unchanged', async () => {
      const onRename = vi.fn() as (oldName: string, newName: string) => void
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      const input = screen.getByDisplayValue('_SUPPORT')
      await userEvent.click(input)
      await userEvent.tab() // blur without changing
      expect(onRename).not.toHaveBeenCalled()
    })
  })

  describe('column reorder', () => {
    it('column headers are draggable when onCategoryReorder is provided', async () => {
      const entryRepo = new InMemoryTimeEntryRepository([])
      const windowRepo = new InMemoryWorkPeriodRepository([])
      const confirmRepo = new InMemoryDayConfirmationRepository()
      const dayTypeRepo = new InMemoryDayTypeOverrideRepository()
      const locationRepo = new InMemoryWorkLocationRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <MonthGrid
            year={2026}
            month={5}
            timeEntryRepository={entryRepo}
            workPeriodRepository={windowRepo}
            dayConfirmationRepository={confirmRepo}
            dayTypeOverrideRepository={dayTypeRepo}
            workLocationRepository={locationRepo}
            autoCategory="_COREMEDIA"
            onCategoryReorder={vi.fn()}
          />
        </QueryClientProvider>,
      )
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      expect(header).toHaveAttribute('draggable', 'true')
    })
  })
})
