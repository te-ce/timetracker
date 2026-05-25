import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
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

function setup(opts: {
  entries?: TimeEntry[]
  windows?: WorkPeriod[]
  autoCategory?: string
  confirmedDays?: Set<string>
  dayTypes?: Map<string, import('../domain/dayType').DayType>
  workLocations?: Map<string, import('../repositories/types').WorkLocation>
  defaultWorkLocation?: import('../repositories/types').WorkLocation | null
  onCategoryReorder?: (order: string[]) => void
  onCategoryRename?: (oldName: string, newName: string) => void
  onAutoCategoryChange?: (category: string) => void
  onSelectDate?: (isoDate: string) => void
  sprintStartDate?: string | null
  sprintLengthDays?: number
  customCategories?: string[]
} = {}) {
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
        autoCategory={opts.autoCategory ?? '_COREMEDIA'}
        customCategories={opts.customCategories}
        confirmedDays={opts.confirmedDays}
        dayTypes={opts.dayTypes}
        workLocations={opts.workLocations}
        defaultWorkLocation={opts.defaultWorkLocation}
        onCategoryReorder={opts.onCategoryReorder}
        onCategoryRename={opts.onCategoryRename}
        onAutoCategoryChange={opts.onAutoCategoryChange}
        onSelectDate={opts.onSelectDate}
        sprintStartDate={opts.sprintStartDate}
        sprintLengthDays={opts.sprintLengthDays}
      />
    </QueryClientProvider>,
  )

  return { entryRepo, windowRepo, confirmRepo, dayTypeRepo, locationRepo }
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
      const onRename = vi.fn<(oldName: string, newName: string) => void>()
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      expect(screen.getByDisplayValue('_SUPPORT')).toBeInTheDocument()
    })

    it('pressing Enter commits the rename', async () => {
      const onRename = vi.fn<(oldName: string, newName: string) => void>()
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      const input = screen.getByDisplayValue('_SUPPORT')
      await userEvent.clear(input)
      await userEvent.type(input, 'Support{Enter}')
      expect(onRename).toHaveBeenCalledWith('_SUPPORT', 'Support')
    })

    it('pressing Escape cancels without calling onCategoryRename', async () => {
      const onRename = vi.fn<(oldName: string, newName: string) => void>()
      setupWithRename(onRename)
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      await userEvent.dblClick(within(header).getByText('_SUPPORT'))
      await userEvent.keyboard('{Escape}')
      expect(onRename).not.toHaveBeenCalled()
      expect(screen.queryByDisplayValue('_SUPPORT')).not.toBeInTheDocument()
    })

    it('does not call onCategoryRename when name is unchanged', async () => {
      const onRename = vi.fn<(oldName: string, newName: string) => void>()
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

  describe('inline editing', () => {
    it('pressing Enter in a cell blurs and saves the value', async () => {
      const { entryRepo } = setup({
        windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-01/ })
      const cell = within(row).getByLabelText('Hours for _SUPPORT on 2026-05-01')
      await userEvent.type(cell, '2{Enter}')

      await waitFor(async () => {
        const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
        expect(entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(2)
      })
    })

    it('entering 0 via fireEvent deletes an existing entry', async () => {
      const { entryRepo } = setup({
        entries: [{ id: 'e1', date: '2026-05-01', category: '_SUPPORT', hours: 3 }],
        windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-01/ })
      const cell = within(row).getByLabelText('Hours for _SUPPORT on 2026-05-01')
      // fireEvent.change directly sets value and fires onChange
      fireEvent.change(cell, { target: { value: '0' } })
      fireEvent.blur(cell)

      await waitFor(async () => {
        const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
        expect(entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
      })
    })

    it('clearing a cell deletes an existing entry', async () => {
      const { entryRepo } = setup({
        entries: [{ id: 'e1', date: '2026-05-01', category: '_SUPPORT', hours: 3 }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-01/ })
      const cell = within(row).getByLabelText('Hours for _SUPPORT on 2026-05-01')
      // Wait for entries to load so handleBlur can find the existing entry
      await waitFor(() => expect(cell).toHaveValue(3))
      // fireEvent.change sets empty string → isNaN → delete
      fireEvent.change(cell, { target: { value: '' } })
      fireEvent.blur(cell)

      await waitFor(async () => {
        const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
        expect(entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
      })
    })

    it('updates existing entry rather than creating a new one', async () => {
      const { entryRepo } = setup({
        entries: [{ id: 'e1', date: '2026-05-01', category: '_SUPPORT', hours: 3 }],
        windows: [{ id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-01/ })
      const cell = within(row).getByLabelText('Hours for _SUPPORT on 2026-05-01')
      // Set a new value via fireEvent to bypass controlled input issues with number inputs
      fireEvent.change(cell, { target: { value: '5' } })
      fireEvent.blur(cell)

      await waitFor(async () => {
        const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
        const supportEntries = entries.filter((e) => e.category === '_SUPPORT')
        expect(supportEntries).toHaveLength(1)
        expect(supportEntries[0].hours).toBe(5)
      })
    })
  })

  describe('confirm/unconfirm day', () => {
    it('clicking the confirm cell saves to the repository', async () => {
      const { confirmRepo } = setup({
        windows: [{ id: 'w1', date: '2026-05-04', start: '09:00', end: '17:00' }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      // The confirm <td> has aria-label — find it as a cell
      const confirmCell = within(row).getByRole('cell', { name: 'Confirm 2026-05-04' })
      await userEvent.click(confirmCell)

      await waitFor(async () => {
        const confirmed = await confirmRepo.isConfirmed('2026-05-04')
        expect(confirmed).toBe(true)
      })
    })

    it('clicking an already-confirmed day removes it from the repository', async () => {
      const { confirmRepo } = setup({
        confirmedDays: new Set(['2026-05-04']),
      })
      // Pre-seed the confirmRepo to match the prop
      await confirmRepo.confirm('2026-05-04')

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const unconfirmCell = within(row).getByRole('cell', { name: 'Unconfirm 2026-05-04' })
      await userEvent.click(unconfirmCell)

      await waitFor(async () => {
        const confirmed = await confirmRepo.isConfirmed('2026-05-04')
        expect(confirmed).toBe(false)
      })
    })

    it('confirmed day shows checkmark', async () => {
      setup({
        confirmedDays: new Set(['2026-05-04']),
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      expect(within(row).getByText('✓')).toBeInTheDocument()
    })

    it('unconfirmed work day shows circle', async () => {
      setup()
      // May 4 is a Monday (work day), should show ○
      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      expect(within(row).getByText('○')).toBeInTheDocument()
    })

    it('non-work days do not show the confirm circle', async () => {
      setup()
      // May 2 is Saturday — should not have ✓ or ○ spans (non-work day branch)
      const row = await screen.findByRole('row', { name: /2026-05-02/ })
      expect(within(row).queryByText('✓')).not.toBeInTheDocument()
      expect(within(row).queryByText('○')).not.toBeInTheDocument()
    })
  })

  describe('day type popover', () => {
    it('clicking the status dot opens the day type popover', async () => {
      setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      expect(await screen.findByText('Day type')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Work Day' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Vacation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sick Day' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Public Holiday' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Absence' })).toBeInTheDocument()
    })

    it('selecting a day type saves the override and closes the popover', async () => {
      const { dayTypeRepo } = setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.click(screen.getByRole('button', { name: 'Vacation' }))

      await waitFor(async () => {
        const override = await dayTypeRepo.findByDate('2026-05-04')
        expect(override).toBe('Vacation')
      })

      expect(screen.queryByText('Day type')).not.toBeInTheDocument()
    })

    it('selecting WorkDay deletes the override', async () => {
      const { dayTypeRepo } = setup({
        dayTypes: new Map([['2026-05-04', 'Vacation']]),
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.click(screen.getByRole('button', { name: 'Work Day' }))

      await waitFor(async () => {
        const override = await dayTypeRepo.findByDate('2026-05-04')
        expect(override).toBeNull()
      })
    })

    it('pressing Escape closes the popover without saving', async () => {
      setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Day type')).not.toBeInTheDocument()
      })
    })

    it('clicking outside the popover closes it', async () => {
      setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.click(document.body)

      await waitFor(() => {
        expect(screen.queryByText('Day type')).not.toBeInTheDocument()
      })
    })
  })

  describe('location toggle', () => {
    it('clicking the location cell cycles from Remote to Office', async () => {
      const { locationRepo } = setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const locButton = within(row).getByLabelText('Location 2026-05-04')
      // Default is Remote (🏠)
      expect(locButton).toHaveTextContent('🏠')
      await userEvent.click(locButton)

      await waitFor(async () => {
        const loc = await locationRepo.findByDate('2026-05-04')
        expect(loc).toBe('Office')
      })
    })

    it('cycling again from Office goes back to Remote', async () => {
      const { locationRepo } = setup({
        workLocations: new Map([['2026-05-04', 'Office']]),
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const locButton = within(row).getByLabelText('Location 2026-05-04')
      expect(locButton).toHaveTextContent('🏢')
      await userEvent.click(locButton)

      await waitFor(async () => {
        const loc = await locationRepo.findByDate('2026-05-04')
        expect(loc).toBe('Remote')
      })
    })

    it('uses defaultWorkLocation when no per-day location is set', async () => {
      setup({ defaultWorkLocation: 'Office' })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const locButton = within(row).getByLabelText('Location 2026-05-04')
      expect(locButton).toHaveTextContent('🏢')
    })
  })

  describe('onSelectDate', () => {
    it('renders day cell as a button when onSelectDate is provided', async () => {
      const onSelectDate = vi.fn<(isoDate: string) => void>()
      setup({ onSelectDate })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dayBtn = within(row).getByTitle('Open 2026-05-04')
      expect(dayBtn).toBeInTheDocument()
    })

    it('clicking the day cell calls onSelectDate with the iso date', async () => {
      const onSelectDate = vi.fn<(isoDate: string) => void>()
      setup({ onSelectDate })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dayBtn = within(row).getByTitle('Open 2026-05-04')
      await userEvent.click(dayBtn)

      expect(onSelectDate).toHaveBeenCalledWith('2026-05-04')
    })
  })

  describe('auto category change', () => {
    it('shows set-auto button for non-auto categories when onAutoCategoryChange is provided', async () => {
      setup({ onAutoCategoryChange: vi.fn() })

      // The ○ button should be present for non-auto categories
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      // The ○ button is inside the badge row (aria-hidden)
      // We look for it by title since it's within aria-hidden span
      const setAutoBtn = within(header).getByTitle('Set "_SUPPORT" as auto category')
      expect(setAutoBtn).toBeInTheDocument()
    })

    it('clicking the ○ badge calls onAutoCategoryChange with the category', async () => {
      const onAutoCategoryChange = vi.fn<(cat: string) => void>()
      setup({ onAutoCategoryChange })

      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      const setAutoBtn = within(header).getByTitle('Set "_SUPPORT" as auto category')
      await userEvent.click(setAutoBtn)

      expect(onAutoCategoryChange).toHaveBeenCalledWith('_SUPPORT')
    })

    it('shows "auto" badge for the current auto category', async () => {
      setup()
      // _COREMEDIA is autoCategory — its badge span says "auto"
      const header = await screen.findByRole('columnheader', { name: '_COREMEDIA' })
      // The auto badge is inside aria-hidden span, query by text
      expect(within(header).getByText('auto')).toBeInTheDocument()
    })
  })

  describe('confirmed day shows read-only cells', () => {
    it('confirmed day does not render an editable input for its cells', async () => {
      setup({
        confirmedDays: new Set(['2026-05-04']),
        entries: [{ id: 'e1', date: '2026-05-04', category: '_SUPPORT', hours: 3 }],
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      expect(within(row).queryByLabelText('Hours for _SUPPORT on 2026-05-04')).not.toBeInTheDocument()
    })
  })

  describe('sprint groups', () => {
    it('renders sprint group headers when sprintStartDate is set', async () => {
      setup({
        sprintStartDate: '2026-05-01',
        sprintLengthDays: 14,
      })

      expect(await screen.findByText('Sprint 1')).toBeInTheDocument()
      expect(screen.getByText('Sprint 1 Total')).toBeInTheDocument()
    })

    it('does not render sprint headers when sprintStartDate is null', async () => {
      setup({ sprintStartDate: null })

      await screen.findByRole('row', { name: /2026-05-01/ })
      expect(screen.queryByText(/Sprint \d/)).not.toBeInTheDocument()
    })
  })
})
