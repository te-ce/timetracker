import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository, InMemoryTimeTrackingRepository } from '../repositories/in-memory'
import { TimeEntryPanel } from './TimeEntryPanel'
import { DEFAULT_CATEGORIES } from '../repositories/types'
import type { MonthData, MonthRepository } from '../repositories/types'
import { QUERY_KEYS } from '../hooks/queryKeys'

const DATE = '2024-01-15'
const YEAR = 2024
const MONTH = 1

function TestPanel({
  repo,
  trackingRepo,
  autoCategory,
  onAutoCategoryChange,
  onCategoryReorder,
  customCategories,
}: {
  repo: MonthRepository
  trackingRepo: InMemoryTimeTrackingRepository
  autoCategory?: string
  onAutoCategoryChange?: (cat: string | null) => void
  onCategoryReorder?: (order: string[]) => void
  customCategories?: string[]
}) {
  const { data: monthData = {} } = useQuery<MonthData>({
    queryKey: QUERY_KEYS.month(YEAR, MONTH),
    queryFn: () => repo.getMonth(YEAR, MONTH),
  })
  const { data: activeTracking = null } = useQuery({
    queryKey: QUERY_KEYS.activeTracking,
    queryFn: () => trackingRepo.getActive(),
  })
  const entries = monthData[DATE]?.entries ?? []

  return (
    <TimeEntryPanel
      date={DATE}
      entries={entries}
      repository={repo}
      timeTrackingRepository={trackingRepo}
      activeTracking={activeTracking}
      autoCategory={autoCategory ?? null}
      customCategories={customCategories}
      callbacks={{ onAutoCategoryChange, onCategoryReorder }}
    />
  )
}

function setup(initialMonthData: MonthData = {}) {
  const repo = new InMemoryMonthRepository({ [YEAR + '-' + String(MONTH).padStart(2, '0')]: initialMonthData })
  const trackingRepo = new InMemoryTimeTrackingRepository()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TestPanel repo={repo} trackingRepo={trackingRepo} />
    </QueryClientProvider>,
  )
  return { repo, trackingRepo }
}

describe('TimeEntryPanel', () => {
  it('renders all 10 default categories', async () => {
    setup()
    for (const category of DEFAULT_CATEGORIES) {
      expect(await screen.findByText(category)).toBeInTheDocument()
    }
  })

  it('loads existing bookings from the repository on mount', async () => {
    setup({ [DATE]: { entries: [{ id: '1', category: '_SUPPORT', hours: 3 }], windows: [] } })
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
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(2.5)
    })
  })

  it('updates an existing booking with a new value', async () => {
    const { repo } = setup({ [DATE]: { entries: [{ id: '1', category: '_INFRA', hours: 4 }], windows: [] } })
    const input = await screen.findByLabelText('Hours for _INFRA')
    await waitFor(() => expect(input).toHaveValue(4))
    await userEvent.clear(input)
    await userEvent.type(input, '6')
    await userEvent.tab()
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_INFRA')?.hours).toBe(6)
    })
  })

  it('removes the entry when hours set to 0', async () => {
    const { repo } = setup({ [DATE]: { entries: [{ id: '1', category: '_SUPPORT', hours: 3 }], windows: [] } })
    const input = await screen.findByLabelText('Hours for _SUPPORT')
    await waitFor(() => expect(input).toHaveValue(3))
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
    })
  })

  it('displays total booked hours', async () => {
    setup({
      [DATE]: {
        entries: [
          { id: '1', category: '_SUPPORT', hours: 3 },
          { id: '2', category: '_INFRA', hours: 2 },
        ],
        windows: [],
      },
    })
    expect(await screen.findByLabelText('Total booked hours')).toHaveTextContent('5h')
  })

  it('increments hours by 0.25 when + button is clicked', async () => {
    const { repo } = setup({ [DATE]: { entries: [{ id: '1', category: '_SUPPORT', hours: 2 }], windows: [] } })
    const btn = await screen.findByLabelText('Increase _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(2.25)
    })
  })

  it('decrements hours by 0.25 when - button is clicked', async () => {
    const { repo } = setup({ [DATE]: { entries: [{ id: '1', category: '_SUPPORT', hours: 2 }], windows: [] } })
    const btn = await screen.findByLabelText('Decrease _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_SUPPORT')?.hours).toBe(1.75)
    })
  })

  it('does not go below 0 when decrementing', async () => {
    const { repo } = setup({ [DATE]: { entries: [{ id: '1', category: '_SUPPORT', hours: 0.25 }], windows: [] } })
    const btn = await screen.findByLabelText('Decrease _SUPPORT')
    await userEvent.click(btn)
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.entries.find((e) => e.category === '_SUPPORT')).toBeUndefined()
    })
  })

  it('starting category tracking opens a WorkPeriod when none exists', async () => {
    const { repo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      const windows = data[DATE]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]!.end).toBeNull()
    })
  })

  it('starting category tracking does not open a second WorkPeriod when one is already open', async () => {
    const { repo } = setup({ [DATE]: { entries: [], windows: [{ id: 'existing', start: '09:00', end: null }] } })
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      const windows = data[DATE]?.windows ?? []
      expect(windows.filter((w) => w.end === null)).toHaveLength(1)
    })
  })

  it('switching categories keeps the existing open WorkPeriod open and does not create a new one', async () => {
    const { repo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect((data[DATE]?.windows ?? []).length).toBe(1)
    })
    await userEvent.click(screen.getByLabelText('Start tracking _INFRA'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      const windows = data[DATE]?.windows ?? []
      expect(windows).toHaveLength(1)
      expect(windows[0]!.end).toBeNull()
    })
  })

  it('stopping category tracking closes the latest open WorkPeriod', async () => {
    const { repo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      expect((data[DATE]?.windows ?? [])[0]?.end).toBeNull()
    })
    await userEvent.click(screen.getByLabelText('Stop tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      const windows = data[DATE]?.windows ?? []
      expect(windows[0]!.end).not.toBeNull()
      expect(windows[0]!.end).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('stopping tracking is a no-op on WorkPeriods when none are open', async () => {
    const { repo } = setup()
    await screen.findByLabelText('Start tracking _SUPPORT')
    await userEvent.click(screen.getByLabelText('Start tracking _SUPPORT'))
    await userEvent.click(screen.getByLabelText('Stop tracking _SUPPORT'))
    await waitFor(async () => {
      const data = await repo.getMonth(YEAR, MONTH)
      const windows = data[DATE]?.windows ?? []
      expect(windows).toHaveLength(1)
    })
  })

  describe('auto-category toggle', () => {
    function setupWithAutoCategory(autoCategory: string, onAutoCategoryChange: (cat: string | null) => void) {
      const repo = new InMemoryMonthRepository()
      const trackingRepo = new InMemoryTimeTrackingRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <TestPanel
            repo={repo}
            trackingRepo={trackingRepo}
            autoCategory={autoCategory}
            onAutoCategoryChange={onAutoCategoryChange}
          />
        </QueryClientProvider>,
      )
    }

    it('renders toggle buttons for each category when onAutoCategoryChange is provided', async () => {
      const onChange = vi.fn<(cat: string | null) => void>()
      setupWithAutoCategory('_SUPPORT', onChange)
      expect(await screen.findByLabelText('Unset _SUPPORT as auto category')).toBeInTheDocument()
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
      const repo = new InMemoryMonthRepository()
      const trackingRepo = new InMemoryTimeTrackingRepository()
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <TestPanel
            repo={repo}
            trackingRepo={trackingRepo}
            onCategoryReorder={vi.fn()}
            customCategories={[]}
          />
        </QueryClientProvider>,
      )
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
