import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkPeriodPanel } from './WorkPeriodPanel'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { CloudMonthRepository } from '../repositories/cloud/month-repository'
import { InMemoryStorageAdapter } from '../storage/in-memory-adapter'
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

async function addPeriod(start: string, end?: string) {
  await userEvent.type(screen.getByLabelText(/^start$/i), start)
  if (end) await userEvent.type(screen.getByLabelText(/^end$/i), end)
  await userEvent.click(screen.getByRole('button', { name: /add period/i }))
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

  describe('edit period time', () => {
    it('clicking period time opens edit inputs with current values', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
    })

    it('saving an edit updates the period start in the repository', async () => {
      const { repo } = setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      const startInput = screen.getByLabelText('Edit start time')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '08:00')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(async () => {
        expect(await getWindows(repo)).toContainEqual(expect.objectContaining({ start: '08:00' }))
      })
    })

    it('pressing Enter in edit start input saves the period', async () => {
      const { repo } = setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      const startInput = screen.getByLabelText('Edit start time')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '10:00{Enter}')
      await waitFor(async () => {
        expect(await getWindows(repo)).toContainEqual(expect.objectContaining({ start: '10:00' }))
      })
    })

    it('pressing Escape cancels the edit without saving', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      const startInput = screen.getByLabelText('Edit start time')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '07:00')
      await userEvent.keyboard('{Escape}')
      expect(await screen.findByRole('button', { name: /edit period 09:00/i })).toBeInTheDocument()
      expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
    })

    it('Cancel button exits edit mode without saving', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(await screen.findByRole('button', { name: /edit period 09:00/i })).toBeInTheDocument()
      expect(screen.queryByLabelText('Edit start time')).not.toBeInTheDocument()
    })
  })

  describe('add form keyboard shortcuts', () => {
    it('pressing Enter in start input submits the form', async () => {
      const { repo } = setup()
      await screen.findByText(/no periods recorded yet/i)
      await userEvent.type(screen.getByLabelText(/^start$/i), '09:00{Enter}')
      await waitFor(async () => {
        expect(await getWindows(repo)).toHaveLength(1)
      })
    })

    it('pressing Enter in end input submits the form', async () => {
      const { repo } = setup()
      await screen.findByText(/no periods recorded yet/i)
      await userEvent.type(screen.getByLabelText(/^start$/i), '09:00')
      await userEvent.type(screen.getByLabelText(/^end$/i), '17:00{Enter}')
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.end).toBe('17:00')
      })
    })

    it('Now buttons fill start and end fields', async () => {
      setup()
      await screen.findByText(/no periods recorded yet/i)
      const nowButtons = screen.getAllByRole('button', { name: /^now$/i })
      await userEvent.click(nowButtons[0]!)
      const startInput = screen.getByLabelText<HTMLInputElement>(/^start$/i)
      expect(startInput.value).toMatch(/^\d{2}:\d{2}$/)
      await userEvent.click(nowButtons[1]!)
      const endInput = screen.getByLabelText<HTMLInputElement>(/^end$/i)
      expect(endInput.value).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('open period', () => {
    it('prefills start input from open period and disables it', async () => {
      setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      const startInput = screen.getByLabelText<HTMLInputElement>(/^start$/i)
      expect(startInput.value).toBe('09:00')
      expect(startInput).toBeDisabled()
    })

    it('hides start Now button when open period exists', async () => {
      setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      expect(screen.getAllByRole('button', { name: /^now$/i })).toHaveLength(1)
    })

    it('closing an open period saves with given end time', async () => {
      const { repo } = setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.type(screen.getByLabelText(/^end$/i), '17:00')
      await userEvent.click(screen.getByRole('button', { name: /add period/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.start).toBe('09:00')
        expect(saved[0]?.end).toBe('17:00')
      })
    })
  })

  describe('auto-merge on add', () => {
    it('merges into one period when new start matches existing end', async () => {
      const { repo } = setup([period('a', '09:00', '10:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await addPeriod('10:00', '11:00')
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]?.start).toBe('09:00')
        expect(saved[0]?.end).toBe('11:00')
      })
    })

    it('merges into one period when new end matches existing start', async () => {
      const { repo } = setup([period('a', '11:00', '12:00')])
      await screen.findByRole('button', { name: /edit period 11:00/i })
      await addPeriod('10:00', '11:00')
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]?.start).toBe('10:00')
        expect(saved[0]?.end).toBe('12:00')
      })
    })

    it('chains three adjacent periods into one', async () => {
      const { repo } = setup([period('a', '08:00', '09:00'), period('b', '10:00', '11:00')])
      await screen.findByRole('button', { name: /edit period 08:00/i })
      await addPeriod('09:00', '10:00')
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]?.start).toBe('08:00')
        expect(saved[0]?.end).toBe('11:00')
      })
    })

    it('does not merge when there is a gap', async () => {
      const { repo } = setup([period('a', '09:00', '10:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await addPeriod('10:30', '11:30')
      await waitFor(async () => {
        expect(await getWindows(repo)).toHaveLength(2)
      })
    })
  })

  describe('auto-merge on add — async repo (race condition regression)', () => {
    function setupCloud(initialWindows: WorkPeriod[] = []) {
      const storage = new InMemoryStorageAdapter()
      if (initialWindows.length > 0) {
        void storage.put(`months/${YEAR}-${String(MONTH).padStart(2, '0')}.json`, {
          [DATE]: { windows: initialWindows },
        })
      }
      const repo = new CloudMonthRepository(storage)
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      function TestPanelCloud() {
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
            autoCategory={null}
            customCategories={['Work', 'Meeting']}
          />
        )
      }
      render(
        <QueryClientProvider client={queryClient}>
          <TestPanelCloud />
        </QueryClientProvider>,
      )
      return { repo }
    }

    it('merges into exactly one period when new start matches existing end', async () => {
      const { repo } = setupCloud([period('a', '09:00', '10:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await addPeriod('10:00', '11:00')
      await waitFor(async () => {
        const saved = (await repo.getMonth(YEAR, MONTH))[DATE]?.windows ?? []
        expect(saved).toHaveLength(1)
        expect(saved[0]?.start).toBe('09:00')
        expect(saved[0]?.end).toBe('11:00')
      })
    })

    it('merges a three-period chain into exactly one period', async () => {
      const { repo } = setupCloud([period('a', '08:00', '09:00'), period('b', '10:00', '11:00')])
      await screen.findByRole('button', { name: /edit period 08:00/i })
      await addPeriod('09:00', '10:00')
      await waitFor(async () => {
        const saved = (await repo.getMonth(YEAR, MONTH))[DATE]?.windows ?? []
        expect(saved).toHaveLength(1)
        expect(saved[0]?.start).toBe('08:00')
        expect(saved[0]?.end).toBe('11:00')
      })
    })
  })
})
