import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../repositories/in-memory'
import { MonthGrid } from './MonthGrid'
import { DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY } from '../repositories/types'
import type { MonthData, WorkPeriod } from '../repositories/types'

function w(id: string, start: string, end: string, category = '_COREMEDIA'): WorkPeriod {
  return { id, start, end, category, slices: [] }
}

function setup(
  opts: {
    monthData?: MonthData
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
  } = {},
) {
  const repo = new InMemoryMonthRepository(opts.monthData ? { '2026-05': opts.monthData } : {})
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MonthGrid
        year={2026}
        month={5}
        repository={repo}
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

  return { repo }
}

describe('MonthGrid', () => {
  it('renders a row for each day and column headers for categories', async () => {
    setup()

    for (const cat of DEFAULT_CATEGORIES) {
      expect(await screen.findByRole('columnheader', { name: cat })).toBeInTheDocument()
    }

    expect(screen.getByRole('columnheader', { name: /worked/i })).toBeInTheDocument()

    const rows = screen.getAllByRole('row')
    // header row + 31 data rows + 1 footer total row
    expect(rows.length).toBe(33)
  })

  it('displays workedHours computed from WorkPeriods', async () => {
    setup({
      monthData: {
        '2026-05-01': {
          windows: [w('w1', '09:00', '12:00'), w('w2', '13:00', '17:00')],
        },
      },
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    await waitFor(() => {
      expect(within(row).getByTestId('worked-hours')).toHaveTextContent('7')
    })
  })

  it('shows auto-category (uncategorized) hours in the auto-category column', async () => {
    setup({
      monthData: {
        '2026-05-01': {
          windows: [
            {
              ...w('w1', '09:00', '17:00', UNCATEGORIZED_CATEGORY),
              slices: [{ id: 's1', category: '_SUPPORT', hours: 3 }],
            },
          ],
        },
      },
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    // 8h worked, 3h _SUPPORT, 5h uncategorized → appears in _COREMEDIA (auto-category) column
    await waitFor(() => {
      const coremediaCell = within(row).getAllByTitle('Edit hours in Day view')[2]
      expect(coremediaCell).toHaveTextContent('5')
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
      monthData: {
        '2026-05-01': {
          windows: [w('w1', '09:00', '12:00'), w('w2', '13:00', '17:00')],
        },
        '2026-05-02': {
          windows: [w('w3', '08:00', '12:00')],
        },
      },
    })

    await waitFor(() => {
      expect(screen.getByTestId('total-worked')).toHaveTextContent('11.00')
    })
  })

  describe('column rename', () => {
    function setupWithRename(onRename: (oldName: string, newName: string) => void) {
      const repo = new InMemoryMonthRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <MonthGrid year={2026} month={5} repository={repo} autoCategory="_COREMEDIA" onCategoryRename={onRename} />
        </QueryClientProvider>,
      )
      return { repo }
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
      await userEvent.tab()
      expect(onRename).not.toHaveBeenCalled()
    })
  })

  describe('column reorder', () => {
    it('column headers are draggable when onCategoryReorder is provided', async () => {
      const repo = new InMemoryMonthRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <MonthGrid year={2026} month={5} repository={repo} autoCategory="_COREMEDIA" onCategoryReorder={vi.fn()} />
        </QueryClientProvider>,
      )
      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
      expect(header).toHaveAttribute('draggable', 'true')
    })
  })

  describe('confirm/unconfirm day', () => {
    it('clicking the confirm cell saves to the repository', async () => {
      const { repo } = setup({
        monthData: {
          '2026-05-04': {
            windows: [w('w1', '09:00', '17:00')],
          },
        },
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const confirmCell = within(row).getByRole('cell', { name: 'Confirm 2026-05-04' })
      await userEvent.click(confirmCell)

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.confirmed).toBe(true)
      })
    })

    it('clicking an already-confirmed day removes confirmation', async () => {
      const { repo } = setup({
        confirmedDays: new Set(['2026-05-04']),
        monthData: {
          '2026-05-04': { windows: [], confirmed: true },
        },
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const unconfirmCell = within(row).getByRole('cell', { name: 'Unconfirm 2026-05-04' })
      await userEvent.click(unconfirmCell)

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.confirmed).toBeFalsy()
      })
    })

    it('confirmed day shows checkmark', async () => {
      setup({ confirmedDays: new Set(['2026-05-04']) })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      expect(within(row).getByText('✓')).toBeInTheDocument()
    })

    it('unconfirmed work day shows circle', async () => {
      setup()
      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      expect(within(row).getByText('○')).toBeInTheDocument()
    })

    it('non-work days do not show the confirm circle', async () => {
      setup()
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
      const { repo } = setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.click(screen.getByRole('button', { name: 'Vacation' }))

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.dayTypeOverride).toBe('Vacation')
      })

      expect(screen.queryByText('Day type')).not.toBeInTheDocument()
    })

    it('selecting WorkDay deletes the override', async () => {
      const { repo } = setup({
        dayTypes: new Map([['2026-05-04', 'Vacation']]),
        monthData: {
          '2026-05-04': { windows: [], dayTypeOverride: 'Vacation' },
        },
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const dotButton = within(row).getByRole('button', { name: /day status/i })
      await userEvent.click(dotButton)

      await screen.findByText('Day type')
      await userEvent.click(screen.getByRole('button', { name: 'Work Day' }))

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.dayTypeOverride).toBeUndefined()
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
      const { repo } = setup()

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const locButton = within(row).getByLabelText('Location 2026-05-04')
      expect(locButton).toHaveTextContent('🏠')
      await userEvent.click(locButton)

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.location).toBe('Office')
      })
    })

    it('cycling again from Office goes back to Remote', async () => {
      const { repo } = setup({
        workLocations: new Map([['2026-05-04', 'Office']]),
        monthData: { '2026-05-04': { windows: [], location: 'Office' } },
      })

      const row = await screen.findByRole('row', { name: /2026-05-04/ })
      const locButton = within(row).getByLabelText('Location 2026-05-04')
      expect(locButton).toHaveTextContent('🏢')
      await userEvent.click(locButton)

      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data['2026-05-04']?.location).toBe('Remote')
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

      const header = await screen.findByRole('columnheader', { name: '_SUPPORT' })
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
      const header = await screen.findByRole('columnheader', { name: '_COREMEDIA' })
      expect(within(header).getByText('auto')).toBeInTheDocument()
    })
  })

  describe('cells are read-only (edit in day view)', () => {
    it('cells show period-derived hours as read-only spans', async () => {
      setup({
        monthData: {
          '2026-05-04': {
            windows: [w('w1', '09:00', '12:00', '_SUPPORT')],
          },
        },
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

    it('sprint total row shows correct worked hours from periods in that sprint', async () => {
      setup({
        sprintStartDate: '2026-05-01',
        sprintLengthDays: 14,
        monthData: {
          '2026-05-02': {
            windows: [w('a', '09:00', '12:00'), w('b', '13:00', '17:00')],
          },
          '2026-05-05': {
            windows: [w('c', '08:00', '10:30')],
          },
        },
      })

      // 3h + 4h + 2.5h = 9.5h
      await waitFor(() => {
        expect(screen.getByTestId('sprint-worked-Sprint 1')).toHaveTextContent('9.50')
      })
    })

    it('sprint total row shows 0.00 for an empty sprint', async () => {
      setup({
        sprintStartDate: '2026-05-01',
        sprintLengthDays: 14,
      })

      await waitFor(() => {
        expect(screen.getByTestId('sprint-worked-Sprint 1')).toHaveTextContent('0.00')
      })
    })

    it('sprint total row shows category hours for periods in that sprint', async () => {
      setup({
        sprintStartDate: '2026-05-01',
        sprintLengthDays: 14,
        monthData: {
          '2026-05-03': {
            windows: [w('s', '09:00', '11:00', '_SUPPORT')],
          },
        },
      })

      // _SUPPORT gets 2h; worked column also shows 2.00
      await waitFor(() => {
        expect(screen.getByTestId('sprint-worked-Sprint 1')).toHaveTextContent('2.00')
      })
      // Category breakdown: _SUPPORT should show 2.00
      const s1Row = screen.getByText('Sprint 1 Total').closest('tr')!
      expect(within(s1Row).getAllByText('2.00').length).toBeGreaterThanOrEqual(1)
    })

    it('excludes entries from a different sprint in the total row', async () => {
      setup({
        sprintStartDate: '2026-05-01',
        sprintLengthDays: 14,
        monthData: {
          '2026-05-02': {
            windows: [w('in', '09:00', '12:00')], // Sprint 1: 3h
          },
          '2026-05-16': {
            windows: [w('out', '09:00', '17:00')], // Sprint 2: 8h
          },
        },
      })

      await waitFor(() => {
        expect(screen.getByTestId('sprint-worked-Sprint 1')).toHaveTextContent('3.00')
        expect(screen.getByTestId('sprint-worked-Sprint 2')).toHaveTextContent('8.00')
      })
    })
  })
})
