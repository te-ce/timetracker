import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryTimeEntryRepository, InMemoryWorkWindowRepository } from '../repositories/in-memory'
import { MonthGrid } from './MonthGrid'
import { CATEGORIES } from '../repositories/types'
import type { TimeEntry, WorkWindow } from '../repositories/types'

function setup(opts: { entries?: TimeEntry[]; windows?: WorkWindow[] } = {}) {
  const entryRepo = new InMemoryTimeEntryRepository(opts.entries ?? [])
  const windowRepo = new InMemoryWorkWindowRepository(opts.windows ?? [])
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MonthGrid
        year={2026}
        month={5}
        timeEntryRepository={entryRepo}
        workWindowRepository={windowRepo}
        autoCategory="Coremedia"
      />
    </QueryClientProvider>,
  )

  return { entryRepo, windowRepo }
}

describe('MonthGrid', () => {
  it('renders a row for each day and column headers for categories', async () => {
    setup()

    // Column headers
    for (const cat of CATEGORIES) {
      expect(await screen.findByRole('columnheader', { name: cat })).toBeInTheDocument()
    }

    // WorkedHours column
    expect(screen.getByRole('columnheader', { name: /worked/i })).toBeInTheDocument()

    // 31 day rows for May
    const rows = screen.getAllByRole('row')
    // header row + 31 data rows
    expect(rows.length).toBe(32)
  })

  it('displays workedHours computed from WorkWindows', async () => {
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
      windows: [
        { id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' },
      ],
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    const cell = within(row).getByLabelText('Hours for QA on 2026-05-01')
    await userEvent.type(cell, '3')
    await userEvent.tab()

    await waitFor(async () => {
      const entries = await entryRepo.findByDateRange(new Date('2026-05-01'), new Date('2026-05-01'))
      expect(entries.find((e) => e.category === 'QA')?.hours).toBe(3)
    })
  })

  it('shows auto-category column with computed value', async () => {
    setup({
      entries: [
        { id: '1', date: '2026-05-01', category: 'QA', hours: 3 },
      ],
      windows: [
        { id: 'w1', date: '2026-05-01', start: '09:00', end: '17:00' },
      ],
    })

    const row = await screen.findByRole('row', { name: /2026-05-01/ })
    await waitFor(() => {
      expect(within(row).getByTestId('auto-category')).toHaveTextContent('5')
    })
  })

  it('visually mutes weekend rows', async () => {
    setup()

    // May 2, 2026 is Saturday
    const row = await screen.findByRole('row', { name: /2026-05-02/ })
    expect(row).toHaveClass('opacity-50')
  })
})
