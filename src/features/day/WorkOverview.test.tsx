import { render, screen, within, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkOverview } from './WorkOverview'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { CloudMonthRepository } from '../../infra/repositories/cloud/month-repository'
import { InMemoryStorageAdapter } from '../../infra/storage/in-memory-adapter'
import type { WorkPeriod, MonthData, MonthRepository } from '../../infra/repositories/types'
import { QUERY_KEYS } from '../../shared/queryKeys'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const DATE = '2026-06-04'
const YEAR = 2026
const MONTH = 6

function period(id: string, start: string, end: string | null, category = 'Work'): WorkPeriod {
  return { id, start, end, category, subtasks: [] }
}

function periodWithSubtask(
  id: string,
  start: string,
  end: string,
  sliceCategory: string,
  hours: number,
  note?: string,
): WorkPeriod {
  return {
    id,
    start,
    end,
    category: sliceCategory,
    subtasks: [{ id: 'sl-1', category: sliceCategory, hours, note }],
  }
}

function periodWithSubtasks(
  id: string,
  start: string,
  end: string,
  subtasks: { category: string; hours: number }[],
): WorkPeriod {
  return {
    id,
    start,
    end,
    category: subtasks[0]?.category ?? 'Work',
    subtasks: subtasks.map((s, i) => ({ id: `sl-${i}`, category: s.category, hours: s.hours })),
  }
}

function periodWithLiveSubtask(id: string, start: string, sliceCategory: string, sliceStartedAt: string): WorkPeriod {
  return {
    id,
    start,
    end: null,
    category: sliceCategory,
    subtasks: [{ id: 'sl-live', category: sliceCategory, hours: 0, startedAt: sliceStartedAt }],
  }
}

function TestPanel({
  repo,
  autoCategory = null,
  customCategories = ['Work', 'Meeting'],
  categoryDescriptions,
}: {
  repo: MonthRepository
  autoCategory?: string | null
  customCategories?: string[] | undefined
  categoryDescriptions?: Record<string, string> | undefined
}) {
  const { data: monthData = {} } = useQuery<MonthData>({
    queryKey: QUERY_KEYS.month(YEAR, MONTH),
    queryFn: () => repo.getMonth(YEAR, MONTH),
  })
  const windows = monthData[DATE]?.windows ?? []
  return (
    <WorkOverview
      date={DATE}
      windows={windows}
      repository={repo}
      autoCategory={autoCategory}
      customCategories={customCategories}
      categoryDescriptions={categoryDescriptions}
    />
  )
}

function setup(
  initialWindows: WorkPeriod[] = [],
  autoCategory: string | null = null,
  categoryDescriptions?: Record<string, string>,
) {
  const repo = new InMemoryMonthRepository(
    initialWindows.length > 0 ? { '2026-06': { [DATE]: { windows: initialWindows } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TestPanel repo={repo} autoCategory={autoCategory} categoryDescriptions={categoryDescriptions} />
    </QueryClientProvider>,
  )
  return { repo }
}

async function getWindows(repo: InMemoryMonthRepository): Promise<WorkPeriod[]> {
  const data = await repo.getMonth(YEAR, MONTH)
  return data[DATE]?.windows ?? []
}

async function addPeriod(start: string, end?: string) {
  if (start) {
    const startInput = screen.getByLabelText(/^start$/i)
    await userEvent.clear(startInput)
    await userEvent.type(startInput, start)
  }
  if (end) await userEvent.type(screen.getByLabelText(/^end$/i), end)
  await userEvent.click(screen.getByRole('button', { name: end ? /add period/i : /^start tracking$/i }))
}

describe('WorkOverview', () => {
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

  describe('subtask form — parseDurationInput', () => {
    async function setupWithPeriod() {
      const { repo } = setup([period('a', '09:00', '11:00')])
      await screen.findByRole('button', { name: /edit period/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
      return { repo }
    }

    it('accepts decimal hours (1.5)', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '1.5')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks).toHaveLength(1)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.hours).toBe(1.5)
      })
    })

    it('accepts HH:MM format (1:30 → 1.5h)', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '1:30')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.hours).toBe(1.5)
      })
    })

    it('does not add a slice for invalid text input', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/subtask duration/i), 'abc')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await new Promise((r) => setTimeout(r, 0))
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.windows[0]?.subtasks ?? []).toHaveLength(0)
    })

    it('does not add a slice when input is zero', async () => {
      const { repo } = await setupWithPeriod()
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '0')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await new Promise((r) => setTimeout(r, 0))
      const data = await repo.getMonth(YEAR, MONTH)
      expect(data[DATE]?.windows[0]?.subtasks ?? []).toHaveLength(0)
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

    it('end time input keeps focus after value change triggers re-render', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period 09:00/i })
      await userEvent.click(screen.getByRole('button', { name: /edit period 09:00/i }))
      const endInput = screen.getByLabelText('Edit end time')
      endInput.focus()
      fireEvent.change(endInput, { target: { value: '18:00' } })
      expect(document.activeElement).toBe(endInput)
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
  })

  describe('add period form', () => {
    it('prefills start input with current time', async () => {
      setup()
      await screen.findByText(/no periods recorded yet/i)
      expect(screen.getByLabelText(/^start$/i)).toHaveDisplayValue(/^\d{2}:\d{2}$/)
    })

    it('defaults category dropdown to autoCategory when provided', async () => {
      setup([], 'Work')
      await screen.findByText(/no periods recorded yet/i)
      expect(screen.getByLabelText(/^category$/i)).toHaveValue('Work')
    })

    it('Start tracking creates a live period with end null', async () => {
      const { repo } = setup()
      await screen.findByText(/no periods recorded yet/i)
      const startInput = screen.getByLabelText(/^start$/i)
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '09:00')
      await userEvent.click(screen.getByRole('button', { name: /^start tracking$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.start).toBe('09:00')
        expect(saved[0]?.end).toBeNull()
      })
    })

    it('Start tracking button is disabled when an open period already exists', async () => {
      setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /stop tracking/i })
      expect(screen.getByRole('button', { name: /^start tracking$/i })).toBeDisabled()
    })

    it('Add period button is enabled even when an open period exists', async () => {
      const { repo } = setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /stop tracking/i })
      await userEvent.type(screen.getByLabelText(/^start$/i), '07:00')
      await userEvent.type(screen.getByLabelText(/^end$/i), '08:00')
      await userEvent.click(screen.getByRole('button', { name: /add period/i }))
      await waitFor(async () => {
        expect(await getWindows(repo)).toHaveLength(2)
      })
    })
  })

  describe('running period — Stop tracking', () => {
    it('shows Stop button on running period', async () => {
      setup([period('a', '09:00', null)])
      expect(await screen.findByRole('button', { name: /stop tracking/i })).toBeInTheDocument()
    })

    it('clicking Stop shows Cancel and Confirm buttons inline, hides Stop', async () => {
      setup([period('a', '09:00', null)])
      await userEvent.click(await screen.findByRole('button', { name: /stop tracking/i }))
      expect(screen.queryByRole('button', { name: /stop tracking/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/period ended at/i)).toBeInTheDocument()
    })

    it('Cancel in stop form restores Stop button', async () => {
      setup([period('a', '09:00', null)])
      await userEvent.click(await screen.findByRole('button', { name: /stop tracking/i }))
      await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
      expect(await screen.findByRole('button', { name: /stop tracking/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
    })

    it('Stop button sets period end time in repository', async () => {
      const { repo } = setup([period('a', '09:00', null)])
      await userEvent.click(await screen.findByRole('button', { name: /stop tracking/i }))
      const stopInput = screen.getByLabelText(/period ended at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '17:00')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.start).toBe('09:00')
        expect(saved[0]?.end).toBe('17:00')
      })
    })

    it('Stop rejects time not after period start', async () => {
      setup([period('a', '10:00', null)])
      await userEvent.click(await screen.findByRole('button', { name: /stop tracking/i }))
      const stopInput = screen.getByLabelText(/period ended at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '09:00')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      expect(await screen.findByText(/must be after/i)).toBeInTheDocument()
    })

    it('no Stop button on closed period', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period/i })
      expect(screen.queryByRole('button', { name: /stop tracking/i })).not.toBeInTheDocument()
    })
  })

  describe('live subtask tracking', () => {
    it('shows Start subtask button on running period', async () => {
      setup([period('a', '09:00', null)])
      expect(await screen.findByRole('button', { name: /start tracking subtask/i })).toBeInTheDocument()
    })

    it('does not show Start subtask button on closed period', async () => {
      setup([period('a', '09:00', '17:00')])
      await screen.findByRole('button', { name: /edit period/i })
      expect(screen.queryByRole('button', { name: /start tracking subtask/i })).not.toBeInTheDocument()
    })

    it('Start subtask persists a live slice in the repository', async () => {
      const { repo } = setup([period('a', '09:00', null)])
      await screen.findByRole('button', { name: /start tracking subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /start tracking subtask/i }))
      await userEvent.click(screen.getByRole('button', { name: /^start$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks).toHaveLength(1)
        expect(saved[0]?.subtasks[0]?.startedAt).toBeDefined()
        expect(saved[0]?.subtasks[0]?.hours).toBe(0)
      })
    })

    it('shows live subtask banner with Stop slice button', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      expect(await screen.findByRole('button', { name: /stop subtask/i })).toBeInTheDocument()
    })

    it('clicking Stop subtask shows Cancel and Confirm buttons inline, hides Stop subtask', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      expect(screen.queryByRole('button', { name: /stop subtask/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^confirm$/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/subtask stopped at/i)).toBeInTheDocument()
    })

    it('delete × button remains visible while stop subtask form is open', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      expect(screen.getByRole('button', { name: /delete live subtask/i })).toBeInTheDocument()
    })

    it('Cancel in stop subtask form restores Stop subtask button', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
      expect(await screen.findByRole('button', { name: /stop subtask/i })).toBeInTheDocument()
    })

    it('Stop subtask saves computed hours and preserves start/end times', async () => {
      const { repo } = setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:00')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      const stopInput = screen.getByLabelText(/subtask stopped at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '10:30')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks[0]?.hours).toBe(1.5)
        expect(saved[0]?.subtasks[0]?.startedAt).toBe('09:00')
        expect(saved[0]?.subtasks[0]?.stoppedAt).toBe('10:30')
      })
    })

    it('Stop subtask rejects time before slice start', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '10:00')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      const stopInput = screen.getByLabelText(/subtask stopped at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '09:00')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      expect(await screen.findByText(/must be at or after/i)).toBeInTheDocument()
    })

    it('Stop subtask allows start == end (saves 0 hours)', async () => {
      const { repo } = setup([periodWithLiveSubtask('a', '09:00', 'Work', '10:00')])
      await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))
      const stopInput = screen.getByLabelText(/subtask stopped at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '10:00')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks[0]?.hours).toBe(0)
        expect(saved[0]?.subtasks[0]?.startedAt).toBe('10:00')
        expect(saved[0]?.subtasks[0]?.stoppedAt).toBe('10:00')
      })
    })

    it('Delete live subtask button removes it from the repository', async () => {
      const { repo } = setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await screen.findByRole('button', { name: /delete live subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /delete live subtask/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks).toHaveLength(0)
      })
    })

    it('Stop all (from period header) stops live slice and sets period end', async () => {
      const { repo } = setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:00')])
      await screen.findByRole('button', { name: /stop tracking/i })
      await userEvent.click(screen.getByRole('button', { name: /stop tracking/i }))
      const stopInput = screen.getByLabelText(/period ended at/i)
      await userEvent.clear(stopInput)
      await userEvent.type(stopInput, '11:00')
      await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.end).toBe('11:00')
        expect(saved[0]?.subtasks[0]?.hours).toBe(2)
        expect(saved[0]?.subtasks[0]?.startedAt).toBe('09:00')
        expect(saved[0]?.subtasks[0]?.stoppedAt).toBe('11:00')
      })
    })
  })

  describe('timed subtask editing', () => {
    function periodWithTimedSubtask(
      id: string,
      start: string,
      end: string,
      sliceCategory: string,
      sliceStart: string,
      sliceEnd: string,
    ): WorkPeriod {
      const hours =
        (new Date(`2000-01-01T${sliceEnd}`).getTime() - new Date(`2000-01-01T${sliceStart}`).getTime()) / 3_600_000
      return {
        id,
        start,
        end,
        category: sliceCategory,
        subtasks: [{ id: 'sl-timed', category: sliceCategory, hours, startedAt: sliceStart, stoppedAt: sliceEnd }],
      }
    }

    it('clicking a timed subtask shows start and end time inputs', async () => {
      setup([periodWithTimedSubtask('a', '09:00', '17:00', 'Work', '09:00', '11:00')])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      expect(screen.getByLabelText(/subtask start time/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subtask end time/i)).toBeInTheDocument()
    })

    it('editing end time and saving recomputes hours and preserves start/end', async () => {
      const { repo } = setup([periodWithTimedSubtask('a', '09:00', '17:00', 'Work', '09:00', '10:00')])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      const endInput = screen.getByLabelText(/subtask end time/i)
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '11:30')
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks[0]?.hours).toBeCloseTo(2.5)
        expect(saved[0]?.subtasks[0]?.startedAt).toBe('09:00')
        expect(saved[0]?.subtasks[0]?.stoppedAt).toBe('11:30')
      })
    })

    it('"use decimal" converts timed subtask to decimal on save', async () => {
      const { repo } = setup([periodWithTimedSubtask('a', '09:00', '17:00', 'Work', '09:00', '11:00')])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      await userEvent.click(screen.getByRole('button', { name: /use decimal/i }))
      expect(screen.queryByLabelText(/subtask start time/i)).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks[0]?.startedAt).toBeUndefined()
        expect(saved[0]?.subtasks[0]?.stoppedAt).toBeUndefined()
        expect(saved[0]?.subtasks[0]?.hours).toBeCloseTo(2)
      })
    })
  })

  describe('live subtask category editing', () => {
    it('clicking the live subtask category name shows a category picker', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await screen.findByRole('button', { name: /stop subtask/i })
      const banner = screen.getByTestId('live-subtask-banner')
      await userEvent.click(within(banner).getByRole('button', { name: /^Work/i }))
      expect(banner.querySelector('select')).toBeInTheDocument()
    })

    it('selecting a new category from the picker saves it immediately', async () => {
      const { repo } = setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      await screen.findByRole('button', { name: /stop subtask/i })
      const banner = screen.getByTestId('live-subtask-banner')
      await userEvent.click(within(banner).getByRole('button', { name: /^Work/i }))
      await userEvent.selectOptions(banner.querySelector('select')!, 'Meeting')
      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]?.subtasks[0]?.category).toBe('Meeting')
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

  describe('category descriptions', () => {
    const descriptions = { Work: 'Deep work sessions', Meeting: 'Sync meetings' }

    it('shows category description inline in parentheses in slice row', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1)], null, descriptions)
      const matches = await screen.findAllByText(/\(Deep work sessions\)/)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('does not show description when none configured', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1)])
      await screen.findByText('Work')
      expect(screen.queryByText('Deep work sessions')).not.toBeInTheDocument()
    })

    it('includes description in category dropdown options', async () => {
      setup([period('a', '09:00', '11:00')], null, descriptions)
      await screen.findByRole('button', { name: /log subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
      const selects = screen.getAllByRole<HTMLSelectElement>('combobox', { name: /category/i })
      const allOptions = selects.flatMap((s) => Array.from(s.options).map((o) => o.text))
      expect(allOptions).toContain('Work (Deep work sessions)')
      expect(allOptions).toContain('Meeting (Sync meetings)')
    })

    it('does not append separator when category has no description', async () => {
      setup([period('a', '09:00', '11:00')], null, { Work: 'Deep work sessions' })
      await screen.findByRole('button', { name: /log subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
      const selects = screen.getAllByRole<HTMLSelectElement>('combobox', { name: /category/i })
      const allOptions = selects.flatMap((s) => Array.from(s.options).map((o) => ({ value: o.value, text: o.text })))
      const meetingOption = allOptions.find((o) => o.value === 'Meeting')
      expect(meetingOption?.text).toBe('Meeting')
    })
  })

  describe('subtask notes', () => {
    it('displays existing note below category name in italic', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1, 'Fixed login bug')])
      expect(await screen.findByText('Fixed login bug')).toBeInTheDocument()
    })

    it('does not render note element when subtask has no note', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1)])
      await screen.findByText('Work')
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })

    it('adds a subtask with a note and persists it', async () => {
      const { repo } = setup([period('a', '09:00', '11:00')])
      await screen.findByRole('button', { name: /log subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '1.5')
      await userEvent.type(screen.getByLabelText(/subtask note/i), 'Reviewed PRs')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.note).toBe('Reviewed PRs')
      })
    })

    it('adds a subtask without note when note field is empty', async () => {
      const { repo } = setup([period('a', '09:00', '11:00')])
      await screen.findByRole('button', { name: /log subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /log subtask/i }))
      await userEvent.type(screen.getByLabelText(/subtask duration/i), '1')
      await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.note).toBeUndefined()
      })
    })

    it('editing a subtask prefills note input with existing note', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1, 'Initial note')])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      expect(screen.getByLabelText<HTMLInputElement>(/subtask note/i).value).toBe('Initial note')
    })

    it('editing a subtask updates the note in the repository', async () => {
      const { repo } = setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1, 'Old note')])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      const noteInput = screen.getByLabelText(/subtask note/i)
      await userEvent.clear(noteInput)
      await userEvent.type(noteInput, 'New note')
      await userEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(YEAR, MONTH)
        expect(data[DATE]?.windows[0]?.subtasks[0]?.note).toBe('New note')
      })
    })

    it('note input keeps focus while typing (no focus steal)', async () => {
      setup([periodWithSubtask('a', '09:00', '11:00', 'Work', 1)])
      await screen.findByRole('button', { name: /edit Work subtask/i })
      await userEvent.click(screen.getByRole('button', { name: /edit Work subtask/i }))
      const noteInput = screen.getByLabelText(/subtask note/i)
      noteInput.focus()
      await userEvent.type(noteInput, 'abc')
      expect(document.activeElement).toBe(noteInput)
    })
  })

  describe('subtask row alternating backgrounds', () => {
    const STRIPE = 'bg-gray-50'

    it('first subtask row (unified index 1) has stripe background', async () => {
      setup([periodWithSubtasks('a', '09:00', '11:00', [{ category: 'Work', hours: 1 }])])
      const rows = await screen.findAllByTestId('subtask-row')
      expect(rows[0]?.className).toContain(STRIPE)
    })

    it('second subtask row (unified index 2) has no stripe background', async () => {
      setup([
        periodWithSubtasks('a', '09:00', '11:00', [
          { category: 'Work', hours: 1 },
          { category: 'Meeting', hours: 0.5 },
        ]),
      ])
      const rows = await screen.findAllByTestId('subtask-row')
      expect(rows[1]?.className).not.toContain(STRIPE)
    })

    it('third subtask row (unified index 3) has stripe background', async () => {
      setup([
        periodWithSubtasks('a', '09:00', '11:00', [
          { category: 'Work', hours: 1 },
          { category: 'Meeting', hours: 0.5 },
          { category: 'Work', hours: 0.5 },
        ]),
      ])
      const rows = await screen.findAllByTestId('subtask-row')
      expect(rows[2]?.className).toContain(STRIPE)
    })
  })

  describe('new card layout', () => {
    it('period-card-header shows duration before from-to time range', async () => {
      setup([period('a', '09:00', '11:00')])
      const header = await screen.findByTestId('period-card-header')
      const duration = within(header).getByTestId('period-duration')
      const timeBtn = within(header).getByRole('button', { name: /edit period/i })
      expect(duration.compareDocumentPosition(timeBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('live subtask banner shows the time the subtask started', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      const banner = await screen.findByTestId('live-subtask-banner')
      expect(within(banner).getByText(/09:30/)).toBeInTheDocument()
    })

    it('period card header has no category picker', async () => {
      setup([period('a', '09:00', '11:00')])
      const header = await screen.findByTestId('period-card-header')
      expect(within(header).queryByRole('combobox', { name: /category/i })).not.toBeInTheDocument()
    })

    it('shows auto-category row with main badge', async () => {
      setup([period('a', '09:00', '11:00', 'Work')])
      expect(await screen.findByTestId('auto-category-row')).toBeInTheDocument()
      expect(screen.getByText('main')).toBeInTheDocument()
    })

    it('auto-category row has a category dropdown to change main category', async () => {
      const { repo } = setup([period('a', '09:00', '11:00', 'Work')])
      const row = await screen.findByTestId('auto-category-row')
      const picker = within(row).getByRole('combobox', { name: /category/i })
      await userEvent.selectOptions(picker, 'Meeting')
      await waitFor(async () => {
        expect(await getWindows(repo)).toContainEqual(expect.objectContaining({ category: 'Meeting' }))
      })
    })

    it('auto-category row shows info icon indicating change is period-scoped', async () => {
      setup([period('a', '09:00', '11:00', 'Work')])
      const row = await screen.findByTestId('auto-category-row')
      expect(within(row).getByLabelText(/applies to this work period only/i)).toBeInTheDocument()
    })

    it('header shows total duration for a closed period', async () => {
      setup([period('a', '09:00', '11:00')])
      const header = await screen.findByTestId('period-card-header')
      expect(within(header).getByTestId('period-duration')).toBeInTheDocument()
    })

    it('auto-category row shows live pulsing indicator when no live subtask', async () => {
      setup([period('a', '09:00', null)])
      const row = await screen.findByTestId('auto-category-row')
      expect(row.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('auto-category row has no pulsing indicator when period is closed', async () => {
      setup([period('a', '09:00', '11:00')])
      const row = await screen.findByTestId('auto-category-row')
      expect(row.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('auto-category row has no pulsing indicator when a live subtask is active', async () => {
      setup([periodWithLiveSubtask('a', '09:00', 'Work', '09:30')])
      const row = await screen.findByTestId('auto-category-row')
      expect(row.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('completed subtasks render oldest first', async () => {
      setup([
        periodWithSubtasks('a', '09:00', '11:00', [
          { category: 'Work', hours: 1 },
          { category: 'Meeting', hours: 0.5 },
        ]),
      ])
      const rows = await screen.findAllByTestId('subtask-row')
      expect(rows[0]).toHaveTextContent('Work')
      expect(rows[1]).toHaveTextContent('Meeting')
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
          <WorkOverview
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
