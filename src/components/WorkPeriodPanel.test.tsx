import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkPeriodPanel } from './WorkPeriodPanel'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import type { WorkPeriod, MonthData, MonthRepository } from '../repositories/types'
import { QUERY_KEYS } from '../hooks/queryKeys'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6

function period(id: string, start: string, end: string | null, category = 'Work'): WorkPeriod {
  return { id, start, end, category, slices: [] }
}

function TestPanel({
  repo,
  autoCategory = null,
  customCategories = ['Work', 'Meeting'],
}: {
  repo: MonthRepository
  autoCategory?: string | null
  customCategories?: string[]
}) {
  const { data: monthData = {} } = useQuery<MonthData>({
    queryKey: QUERY_KEYS.month(YEAR, MONTH),
    queryFn: () => repo.getMonth(YEAR, MONTH),
  })
  const windows = monthData[DATE]?.windows ?? []
  return (
    <WorkPeriodPanel
      date={DATE}
      windows={windows}
      repository={repo}
      autoCategory={autoCategory}
      customCategories={customCategories}
    />
  )
}

function setup(initialWindows: WorkPeriod[] = [], autoCategory: string | null = null) {
  const repo = new InMemoryMonthRepository(
    initialWindows.length > 0 ? { '2026-06': { [DATE]: { windows: initialWindows } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TestPanel repo={repo} autoCategory={autoCategory} />
    </QueryClientProvider>,
  )
  return { repo }
}

async function getWindows(repo: InMemoryMonthRepository): Promise<WorkPeriod[]> {
  const data = await repo.getMonth(YEAR, MONTH)
  return data[DATE]?.windows ?? []
}

describe('WorkPeriodPanel', () => {
  it('shows empty state when no periods exist', async () => {
    setup()
    expect(await screen.findByText(/no periods recorded yet/i)).toBeInTheDocument()
  })

  it('renders existing periods sorted by start time regardless of insertion order', async () => {
    setup([period('b', '10:00', '11:00'), period('a', '08:00', '09:00')])
    const btns = await screen.findAllByRole('button', { name: /edit period/i })
    expect(btns[0]).toHaveAccessibleName(/08:00/)
    expect(btns[1]).toHaveAccessibleName(/10:00/)
  })

  it('adds a period and persists it in the repository', async () => {
    const { repo } = setup()
    await screen.findByText(/no periods recorded yet/i)
    await userEvent.type(screen.getByLabelText(/start/i), '09:00')
    await userEvent.type(screen.getByLabelText(/end/i), '10:00')
    await userEvent.click(screen.getByRole('button', { name: /add period/i }))
    await waitFor(async () => {
      expect(await getWindows(repo)).toHaveLength(1)
    })
  })

  it('removes a period when × is clicked', async () => {
    const { repo } = setup([period('a', '09:00', '10:00')])
    await screen.findByRole('button', { name: /remove period/i })
    await userEvent.click(screen.getByRole('button', { name: /remove period/i }))
    await waitFor(async () => {
      expect(await getWindows(repo)).toHaveLength(0)
    })
  })

  describe('slice form — parseDurationInput', () => {
    async function setupWithPeriod() {
      const { repo } = setup([period('a', '09:00', '11:00')])
      await screen.findByRole('button', { name: /edit period/i })
      await userEvent.click(screen.getByRole('button', { name: /split this period/i }))
      return { repo }
    }

    it('accepts decimal hours (1.5)', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/slice duration/i), '1.5')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.slices).toHaveLength(1)
        expect(data[DATE]?.windows[0]?.slices[0]?.hours).toBe(1.5)
      })
    })

    it('accepts HH:MM format (1:30 → 1.5h)', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/slice duration/i), '1:30')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.slices[0]?.hours).toBe(1.5)
      })
    })

    it('does not add a slice for invalid text input', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/slice duration/i), 'abc')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await new Promise((r) => setTimeout(r, 0))
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.windows[0]?.slices ?? []).toHaveLength(0)
    })

    it('does not add a slice when input is zero', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/slice duration/i), '0')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await new Promise((r) => setTimeout(r, 0))
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.windows[0]?.slices ?? []).toHaveLength(0)
    })
  })
})
