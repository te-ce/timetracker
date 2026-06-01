import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InMemoryMonthRepository } from '../repositories/in-memory'
import { WorkPeriodPanel } from './WorkPeriodPanel'
import type { WorkPeriod, MonthData, MonthRepository } from '../repositories/types'
import { QUERY_KEYS } from '../hooks/queryKeys'

const DATE = '2024-01-15'
const YEAR = 2024
const MONTH = 1

function TestPanel({ repo }: { repo: MonthRepository }) {
  const { data: monthData = {} } = useQuery<MonthData>({
    queryKey: QUERY_KEYS.month(YEAR, MONTH),
    queryFn: () => repo.getMonth(YEAR, MONTH),
  })
  const windows = monthData[DATE]?.windows ?? []
  return <WorkPeriodPanel date={DATE} windows={windows} repository={repo} />
}

function setup(initialWindows: WorkPeriod[] = []) {
  const repo = new InMemoryMonthRepository(
    initialWindows.length > 0
      ? { '2024-01': { [DATE]: { entries: [], windows: initialWindows } } }
      : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <TestPanel repo={repo} />
    </QueryClientProvider>,
  )
  return { repo }
}

async function addWindow(start: string, end: string) {
  await userEvent.type(screen.getByLabelText(/start/i), start)
  await userEvent.type(screen.getByLabelText(/end/i), end)
  await userEvent.click(screen.getByRole('button', { name: /add/i }))
}

async function getWindows(repo: InMemoryMonthRepository): Promise<WorkPeriod[]> {
  const data = await repo.getMonth(YEAR, MONTH)
  return data[DATE]?.windows ?? []
}

describe('WorkPeriodPanel', () => {
  it('shows an empty state message when no WorkPeriods exist', async () => {
    setup()
    expect(await screen.findByText(/no work periods/i)).toBeInTheDocument()
  })

  it('does not show Restarbeitszeit when no WorkPeriods exist', async () => {
    setup()
    await screen.findByText(/no work periods/i)
    expect(screen.queryByLabelText(/restarbeitszeit/i)).not.toBeInTheDocument()
  })

  it('shows the window in the list after the user adds it', async () => {
    setup()
    await screen.findByText(/no work periods/i)
    await addWindow('09:00', '17:00')
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(await screen.findByText(/no work periods/i)).toBeInTheDocument()
  })

  it('hides Restarbeitszeit again when the last WorkPeriod is removed', async () => {
    setup()
    await screen.findByText(/no work periods/i)
    await addWindow('09:00', '17:00')
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByRole('button', { name: /remove/i }))
    await screen.findByText(/no work periods/i)
    expect(screen.queryByLabelText(/restarbeitszeit/i)).not.toBeInTheDocument()
  })

  it('clicking a window shows edit inputs with current values', async () => {
    setup([{ id: 'w1', start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument()
  })

  it('editing a window updates the stored time', async () => {
    const { repo } = setup([{ id: 'w1', start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))

    const startInput = screen.getByDisplayValue('09:00')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '08:00')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('08:00 – 17:00')).toBeInTheDocument()
    const saved = await getWindows(repo)
    expect(saved[0]!.start).toBe('08:00')
  })

  it('pressing Escape cancels editing without saving', async () => {
    setup([{ id: 'w1', start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))

    const startInput = screen.getByDisplayValue('09:00')
    await userEvent.clear(startInput)
    await userEvent.type(startInput, '07:00')
    await userEvent.keyboard('{Escape}')

    expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('07:00')).not.toBeInTheDocument()
  })

  it('Add button is enabled when only start is set (no end required)', async () => {
    setup()
    await screen.findByText(/no work periods/i)
    await userEvent.type(screen.getByLabelText(/start/i), '09:00')
    expect(screen.getByRole('button', { name: /add/i })).not.toBeDisabled()
  })

  it('saves an open WorkPeriod when Add is clicked with only a start time', async () => {
    const { repo } = setup()
    await screen.findByText(/no work periods/i)
    await userEvent.type(screen.getByLabelText(/start/i), '09:00')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    await waitFor(async () => {
      const windows = await getWindows(repo)
      expect(windows[0]!.start).toBe('09:00')
      expect(windows[0]!.end).toBeNull()
    })
  })

  it('displays an open WorkPeriod as "HH:MM – …"', async () => {
    setup([{ id: 'w1', start: '09:00', end: null }])
    expect(await screen.findByText('09:00 – …')).toBeInTheDocument()
  })

  it('"Now" buttons fill start and end fields with current HH:MM', async () => {
    setup()
    await screen.findByText(/no work periods/i)
    const nowButtons = screen.getAllByRole('button', { name: /now/i })
    await userEvent.click(nowButtons[0]!)
    const startInput = screen.getByLabelText<HTMLInputElement>(/start/i)
    expect(startInput.value).toMatch(/^\d{2}:\d{2}$/)
    await userEvent.click(nowButtons[1]!)
    const endInput = screen.getByLabelText<HTMLInputElement>(/end/i)
    expect(endInput.value).toMatch(/^\d{2}:\d{2}$/)
  })

  it('edit form saves with no end, storing end: null', async () => {
    const { repo } = setup([{ id: 'w1', start: '09:00', end: '17:00' }])
    await screen.findByText('09:00 – 17:00')
    await userEvent.click(screen.getByText('09:00 – 17:00'))

    const endInput = screen.getByDisplayValue('17:00')
    await userEvent.clear(endInput)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(async () => {
      const windows = await getWindows(repo)
      expect(windows[0]!.end).toBeNull()
    })
    expect(await screen.findByText('09:00 – …')).toBeInTheDocument()
  })

  describe('edit form keyboard shortcuts', () => {
    it('pressing Enter in the edit start input saves the period', async () => {
      const { repo } = setup([{ id: 'w1', start: '09:00', end: '17:00' }])
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByRole('button', { name: /edit period/i }))

      const startInput = screen.getByLabelText('Edit start time')
      await userEvent.clear(startInput)
      await userEvent.type(startInput, '10:00{Enter}')

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]!.start).toBe('10:00')
      })
    })

    it('pressing Enter in the edit end input saves the period', async () => {
      const { repo } = setup([{ id: 'w1', start: '09:00', end: '17:00' }])
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByRole('button', { name: /edit period/i }))

      const endInput = screen.getByLabelText('Edit end time')
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '18:00{Enter}')

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved[0]!.end).toBe('18:00')
      })
    })

    it('pressing Escape in the edit end input cancels editing', async () => {
      setup([{ id: 'w1', start: '09:00', end: '17:00' }])
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByRole('button', { name: /edit period/i }))

      const endInput = screen.getByLabelText('Edit end time')
      await userEvent.clear(endInput)
      await userEvent.type(endInput, '20:00')
      await userEvent.keyboard('{Escape}')

      expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('20:00')).not.toBeInTheDocument()
    })

    it('Cancel button in edit form returns to view mode', async () => {
      setup([{ id: 'w1', start: '09:00', end: '17:00' }])
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByRole('button', { name: /edit period/i }))

      expect(screen.getByLabelText('Edit start time')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument()
      expect(screen.queryByLabelText('Edit start time')).not.toBeInTheDocument()
    })
  })

  describe('remove button', () => {
    it('Remove button deletes the period from the repository', async () => {
      const { repo } = setup([{ id: 'w1', start: '09:00', end: '17:00' }])
      await screen.findByText('09:00 – 17:00')
      await userEvent.click(screen.getByRole('button', { name: /remove/i }))

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(0)
      })
    })
  })

  describe('merge button', () => {
    it('shows merge button between two adjacent periods', async () => {
      setup([
        { id: 'w1', start: '09:00', end: '13:00' },
        { id: 'w2', start: '14:00', end: '18:00' },
      ])

      await screen.findByText('09:00 – 13:00')
      const mergeBtn = screen.getByRole('button', { name: /merge 09:00–13:00 with 14:00–18:00/i })
      expect(mergeBtn).toBeInTheDocument()
    })

    it('merge button merges two periods into one spanning both', async () => {
      const { repo } = setup([
        { id: 'w1', start: '09:00', end: '13:00' },
        { id: 'w2', start: '14:00', end: '18:00' },
      ])

      await screen.findByText('09:00 – 13:00')
      await userEvent.click(screen.getByRole('button', { name: /merge/i }))

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]!.start).toBe('09:00')
        expect(saved[0]!.end).toBe('18:00')
      })
    })

    it('does not show merge button when a period has no end', async () => {
      setup([
        { id: 'w1', start: '09:00', end: null },
        { id: 'w2', start: '14:00', end: '18:00' },
      ])

      await screen.findByText('09:00 – …')
      expect(screen.queryByRole('button', { name: /merge/i })).not.toBeInTheDocument()
    })

    it('does not show merge button for the last period in the list', async () => {
      setup([
        { id: 'w1', start: '09:00', end: '13:00' },
        { id: 'w2', start: '14:00', end: '18:00' },
      ])

      await screen.findByText('14:00 – 18:00')
      const mergeBtns = screen.getAllByRole('button', { name: /merge/i })
      expect(mergeBtns).toHaveLength(1)
    })

    it('merge picks the later end time when first period ends after second', async () => {
      const { repo } = setup([
        { id: 'w1', start: '09:00', end: '19:00' },
        { id: 'w2', start: '14:00', end: '17:00' },
      ])

      await screen.findByText('09:00 – 19:00')
      await userEvent.click(screen.getByRole('button', { name: /merge/i }))

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]!.start).toBe('09:00')
        expect(saved[0]!.end).toBe('19:00')
      })
    })
  })

  describe('add via Enter key', () => {
    it('pressing Enter in the start input submits the form', async () => {
      const { repo } = setup()
      await screen.findByText(/no work periods/i)
      const startInput = screen.getByLabelText(/start/i)
      await userEvent.type(startInput, '09:00{Enter}')

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]!.start).toBe('09:00')
      })
    })

    it('pressing Enter in the end input submits the form', async () => {
      const { repo } = setup()
      await screen.findByText(/no work periods/i)
      await userEvent.type(screen.getByLabelText(/start/i), '09:00')
      await userEvent.type(screen.getByLabelText(/end/i), '17:00{Enter}')

      await waitFor(async () => {
        const saved = await getWindows(repo)
        expect(saved).toHaveLength(1)
        expect(saved[0]!.start).toBe('09:00')
        expect(saved[0]!.end).toBe('17:00')
      })
    })

    it('Add button is disabled when start is empty', async () => {
      setup()
      await screen.findByText(/no work periods/i)
      expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
    })
  })
})
