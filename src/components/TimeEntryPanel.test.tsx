import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  InMemoryTimeEntryRepository,
  InMemoryTimeTrackingRepository,
  InMemoryWorkPeriodRepository,
} from '../repositories/in-memory'
import { TimeEntryPanel } from './TimeEntryPanel'
import { DEFAULT_CATEGORIES } from '../repositories/types'
import type { TimeEntry, WorkPeriod } from '../repositories/types'

const DATE = '2024-01-15'

function setup(initialEntries: TimeEntry[] = [], initialWindows: WorkPeriod[] = []) {
  const repo = new InMemoryTimeEntryRepository(initialEntries)
  const trackingRepo = new InMemoryTimeTrackingRepository()
  const workPeriodRepo = new InMemoryWorkPeriodRepository(initialWindows)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TimeEntryPanel
        date={DATE}
        repository={repo}
        timeTrackingRepository={trackingRepo}
        workPeriodRepository={workPeriodRepo}
      />
    </QueryClientProvider>,
  )
  return { repo, trackingRepo, workPeriodRepo }
}

describe('TimeEntryPanel', () => {
  it('renders all 10 default categories', async () => {
    setup()
    for (const category of DEFAULT_CATEGORIES) {
      expect(await screen.findByText(category)).toBeInTheDocument()
    }
  })

  it('loads existing bookings from the repository on mount', async () => {
    setup([{ id: '1', date: DATE, category: '_SUPPORT', hours: 3 }])
    const input = await screen.findByLabelText('Hours for _SUPPORT')
    await waitFor(() => expect(input).toHaveValue(3))
  })

  it('saves hours when user types and blurs', async () => {
    const { repo } = setup()
    const input = await screen.findByLabelText('Hours for _SUPPORT')
    await userEvent.clear(input)
    await userEvent.type(input, '2.5')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(2.5)
    })
  })

  it('updates an existing booking with a new value', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: '_INFRA', hours: 4 }])
    const input = await screen.findByLabelText('Hours for _INFRA')
    await waitFor(() => expect(input).toHaveValue(4))
    await userEvent.clear(input)
    await userEvent.type(input, '6')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_INFRA')?.hours).toBe(6)
    })
  })

  it('removes the entry when hours set to 0', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: '_SUPPORT', hours: 3 }])
    const input = await screen.findByLabelText('Hours for _SUPPORT')
    await waitFor(() => expect(input).toHaveValue(3))
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
    })
  })

  it('displays total booked hours', async () => {
    setup([
      { id: '1', date: DATE, category: '_SUPPORT', hours: 3 },
      { id: '2', date: DATE, category: '_INFRA', hours: 2 },
    ])
    expect(await screen.findByLabelText('Total booked hours')).toHaveTextContent('5h')
  })

  it('increments hours by 0.25 when + button is clicked', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: '_SUPPORT', hours: 2 }])
    const btn = await screen.findByLabelText('Increase _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(2.25)
    })
  })

  it('decrements hours by 0.25 when - button is clicked', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: '_SUPPORT', hours: 2 }])
    const btn = await screen.findByLabelText('Decrease _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(1.75)
    })
  })

  it('does not go below 0 when decrementing', async () => {
    const { repo } = setup([{ id: '1', date: DATE, category: '_SUPPORT', hours: 0.25 }])
    const btn = await screen.findByLabelText('Decrease _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const entries = await repo.findByDateRange(new Date(DATE), new Date(DATE))
      expect(entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
    })
  })

  it('starting category tracking opens a WorkPeriod when none exists', async () => {
    const { workPeriodRepo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows).toHaveLength(1)
      expect(windows[0].end).toBeNull()
    })
  })

  it('starting category tracking does not open a second WorkPeriod when one is already open', async () => {
    const openWindow = { id: 'existing', date: DATE, start: '09:00', end: null }
    const { workPeriodRepo } = setup([], [openWindow])
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows.filter((w) => w.end === null)).toHaveLength(1)
    })
  })

  it('switching categories keeps the existing open WorkPeriod open and does not create a new one', async () => {
    const { workPeriodRepo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows).toHaveLength(1)
      expect(windows[0].end).toBeNull()
    })
    // Switch to a different category
    await userEvent.click(screen.getByLabelText('Start tracking _INFRA'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows).toHaveLength(1)
      expect(windows[0].end).toBeNull()
    })
  })

  it('stopping category tracking closes the latest open WorkPeriod', async () => {
    const { workPeriodRepo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows[0].end).toBeNull()
    })
    await userEvent.click(screen.getByLabelText('Stop tracking _SUPPORT'))
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows[0].end).not.toBeNull()
      expect(windows[0].end).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('stopping tracking is a no-op on WorkPeriods when none are open', async () => {
    const { workPeriodRepo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await userEvent.click(screen.getByLabelText('Stop tracking _SUPPORT'))
    // windows now closed; stop again does nothing
    await waitFor(async () => {
      const windows = await workPeriodRepo.findByDate(new Date(DATE))
      expect(windows).toHaveLength(1) // still just the one, not a new one
    })
  })

  describe('auto-category toggle', () => {
    function setupWithAutoCategory(autoCategory: string, onAutoCategoryChange: (cat: string | null) => void) {
      const repo = new InMemoryTimeEntryRepository([])
      const trackingRepo = new InMemoryTimeTrackingRepository()
      const workPeriodRepo = new InMemoryWorkPeriodRepository([])
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <TimeEntryPanel
            date={DATE}
            repository={repo}
            timeTrackingRepository={trackingRepo}
            workPeriodRepository={workPeriodRepo}
            autoCategory={autoCategory}
            onAutoCategoryChange={onAutoCategoryChange}
          />
        </QueryClientProvider>,
      )
    }

    it('renders toggle buttons for each category when onAutoCategoryChange is provided', async () => {
      const onChange = vi.fn<(cat: string | null) => void>()
      setupWithAutoCategory('_SUPPORT', onChange)
      // filled circle on the active auto category
      expect(await screen.findByLabelText('Unset _SUPPORT as auto category')).toBeInTheDocument()
      // empty circle on the others
      expect(screen.getByLabelText('Set _INFRA as auto category')).toBeInTheDocument()
    })

    it('calls onAutoCategoryChange(null) when clicking the active auto category toggle', async () => {
      const onChange = vi.fn<(cat: string | null) => void>()
      setupWithAutoCategory('_SUPPORT', onChange)
      await userEvent.click(await screen.findByLabelText('Unset _SUPPORT as auto category'))
      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('calls onAutoCategoryChange(category) when clicking a non-active toggle', async () => {
      const onChange = vi.fn<(cat: string | null) => void>()
      setupWithAutoCategory('_SUPPORT', onChange)
      await userEvent.click(await screen.findByLabelText('Set _INFRA as auto category'))
      expect(onChange).toHaveBeenCalledWith('_INFRA')
    })

    it('does not render toggle buttons when onAutoCategoryChange is not provided', async () => {
      setup()
      await screen.findAllByText('_SUPPORT')
      expect(screen.queryByLabelText(/as auto category/i)).not.toBeInTheDocument()
    })
  })

  describe('category reorder', () => {
    it('renders drag handles when onCategoryReorder is provided', async () => {
      const onReorder = vi.fn()
      const repo = new InMemoryTimeEntryRepository([])
      const trackingRepo = new InMemoryTimeTrackingRepository()
      const workPeriodRepo = new InMemoryWorkPeriodRepository([])
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <TimeEntryPanel
            date={DATE}
            repository={repo}
            timeTrackingRepository={trackingRepo}
            workPeriodRepository={workPeriodRepo}
            onCategoryReorder={onReorder}
            customCategories={[]}
          />
        </QueryClientProvider>,
      )
      // All 10 default categories should be draggable
      const items = await screen.findAllByRole('listitem')
      for (const item of items) {
        expect(item).toHaveAttribute('draggable', 'true')
      }
    })

    it('list items are not draggable when onCategoryReorder is not provided', async () => {
      setup()
      const items = await screen.findAllByRole('listitem')
      for (const item of items) {
        expect(item).not.toHaveAttribute('draggable', 'true')
      }
    })
  })
})
