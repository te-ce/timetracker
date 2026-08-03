import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { DayTimeline } from './DayTimeline'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import type { MonthData, MonthRepository, WorkPeriod, WorkPeriodSubtask } from '../../infra/repositories/types'
import { QUERY_KEYS } from '../../shared/queryKeys'
import { toLocalIso } from '../../shared/dateUtils'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

// The timeline shows live tracking, planned stops and breaks relative to now, so
// these tests run against today.
const DATE = toLocalIso(new Date())
const MONTH_KEY = DATE.slice(0, 7)

function period(
  id: string,
  start: string,
  end: string | null,
  category = 'Work',
  subtasks: WorkPeriodSubtask[] = [],
): WorkPeriod {
  return { id, start, end, category, subtasks }
}

const PAST_DATE = '2026-05-25'

function Harness({
  repo,
  showTotals = true,
  date = DATE,
}: {
  repo: MonthRepository
  showTotals?: boolean
  date?: string
}) {
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const { data: monthData = {} } = useQuery<MonthData>({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => repo.getMonth(year, month),
  })
  return (
    <DayTimeline
      date={date}
      windows={monthData[date]?.windows ?? []}
      repository={repo}
      autoCategory={null}
      customCategories={['Work', 'Meeting', 'Review']}
      showTotals={showTotals}
    />
  )
}

function setup(initialWindows: WorkPeriod[] = [], showTotals = true, date = DATE) {
  const monthKey = date === DATE ? MONTH_KEY : date.slice(0, 7)
  const repo = new InMemoryMonthRepository(
    initialWindows.length > 0 ? { [monthKey]: { [date]: { windows: initialWindows } } } : {},
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <Harness repo={repo} showTotals={showTotals} date={date} />
    </QueryClientProvider>,
  )
  return { repo }
}

async function getWindows(repo: InMemoryMonthRepository, date = DATE): Promise<WorkPeriod[]> {
  const data = await repo.getMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)))
  return data[date]?.windows ?? []
}

describe('DayTimeline', () => {
  it('lists work periods, their segments and the breaks between them in clock order', async () => {
    // Given a morning period, a half-hour break, then an afternoon period
    setup([period('a', '08:00', '09:30', 'Work'), period('b', '10:00', '13:00', 'Review')])

    // When the day is rendered
    const timeline = await screen.findByRole('list', { name: /day timeline/i })
    let rows: HTMLElement[] = []
    await vi.waitFor(() => {
      rows = within(timeline).getAllByRole('listitem')
      expect(rows).toHaveLength(5)
    })

    // Then the reading order is period, its segment, the break, the next period, its segment
    expect(rows[0]).toHaveAccessibleName(/work period 1/i)
    expect(rows[1]).toHaveAccessibleName(/Work/)
    expect(rows[2]).toHaveAccessibleName(/break/i)
    expect(rows[3]).toHaveAccessibleName(/work period 2/i)
    expect(rows[4]).toHaveAccessibleName(/Review/)
  })

  it('starts an open work period on the chosen category', async () => {
    // Given a day with nothing tracked
    const { repo } = setup()

    // When the user picks a category and starts
    await userEvent.selectOptions(await screen.findByLabelText(/category to start/i), 'Meeting')
    await userEvent.click(screen.getByRole('button', { name: /start tracking/i }))

    // Then one open WorkPeriod exists on that category
    await vi.waitFor(async () => {
      expect(await getWindows(repo)).toMatchObject([{ end: null, category: 'Meeting' }])
    })
  })

  it('stops the running work period with one click and offers no second start', async () => {
    // Given a work period that is running
    const { repo } = setup([period('a', '09:00', null, 'Work')])

    // Then starting again is not offered
    expect(await screen.findByRole('button', { name: /stop work/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start tracking/i })).not.toBeInTheDocument()

    // When the user stops
    await userEvent.click(screen.getByRole('button', { name: /stop work/i }))

    // Then the period is closed
    await vi.waitFor(async () => {
      const [stopped] = await getWindows(repo)
      expect(stopped?.end).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('tracks a subtask on another category and hands tracking back on stop', async () => {
    // Given work running on Work
    const { repo } = setup([period('a', '09:00', null, 'Work')])

    // When the user starts a subtask on a different category
    await userEvent.click(await screen.findByRole('button', { name: /start subtask/i }))
    await userEvent.selectOptions(screen.getByLabelText(/subtask category/i), 'Review')
    await userEvent.click(screen.getByRole('button', { name: /^start$/i }))

    // Then that subtask is the live one
    await vi.waitFor(async () => {
      const [tracked] = await getWindows(repo)
      expect(tracked?.subtasks).toHaveLength(1)
      expect(tracked?.subtasks[0]?.category).toBe('Review')
      expect(tracked?.subtasks[0]?.stoppedAt).toBeUndefined()
    })

    // When the subtask is stopped
    await userEvent.click(await screen.findByRole('button', { name: /stop subtask/i }))

    // Then it is closed and the work period is still running
    await vi.waitFor(async () => {
      const [tracked] = await getWindows(repo)
      expect(tracked?.end).toBeNull()
      expect(tracked?.subtasks[0]?.stoppedAt).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('logs a subtask that was never tracked as a bare duration with a note', async () => {
    // Given a finished work period
    const { repo } = setup([period('a', '10:00', '13:00', 'Work')])

    // When the user logs half an hour from memory
    await userEvent.click(await screen.findByRole('button', { name: /log untracked subtask/i }))
    await userEvent.type(screen.getByLabelText(/subtask duration/i), '0:30')
    await userEvent.selectOptions(screen.getByLabelText(/^category$/i), 'Review')
    await userEvent.type(screen.getByLabelText(/subtask note/i), 'code review')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    // Then it is stored as a duration-only subtask
    await vi.waitFor(async () => {
      const [logged] = await getWindows(repo)
      expect(logged?.subtasks).toHaveLength(1)
      expect(logged?.subtasks[0]).toMatchObject({ category: 'Review', hours: 0.5, note: 'code review' })
      expect(logged?.subtasks[0]?.startedAt).toBeUndefined()
    })

    // And the timeline shows it as time without a clock position
    expect(await screen.findByRole('listitem', { name: /Review/ })).toHaveTextContent(/retro|no times|· · · ·/i)
  })

  it('turns a break into worked time that continues the earlier work period', async () => {
    // Given a break between two work periods
    const { repo } = setup([period('a', '08:00', '09:30', 'Work'), period('b', '10:00', '11:00', 'Review')])

    // When the user says the break was actually work
    await userEvent.click(await screen.findByRole('button', { name: /was work/i }))

    // Then the day is one continuous period on the earlier category and the break is gone
    await vi.waitFor(async () => {
      const windows = await getWindows(repo)
      expect(windows).toHaveLength(1)
      expect(windows[0]).toMatchObject({ start: '08:00', end: '11:00', category: 'Work' })
    })
    expect(screen.queryByRole('listitem', { name: /break/i })).not.toBeInTheDocument()
  })

  it('edits the times of a work period in place', async () => {
    // Given a finished work period
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])

    // When the user corrects both ends
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    fireEvent.change(screen.getByLabelText(/work period 1 start/i), { target: { value: '08:15' } })
    fireEvent.change(screen.getByLabelText(/work period 1 end/i), { target: { value: '10:00' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // Then the new times are stored
    await vi.waitFor(async () => {
      expect((await getWindows(repo))[0]).toMatchObject({ start: '08:15', end: '10:00' })
    })
  })

  it('keeps tracking when the end is set to a time still in the future', async () => {
    // Given work running since 09:00
    const { repo } = setup([period('a', '09:00', null, 'Work')])
    const future = '23:59'

    // When the user declares when they will stop
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    fireEvent.change(screen.getByLabelText(/work period 1 end/i), { target: { value: future } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // Then the planned end is stored and work is still being tracked
    await vi.waitFor(async () => {
      expect((await getWindows(repo))[0]?.end).toBe(future)
    })
    expect(await screen.findByRole('button', { name: /stop work/i })).toBeInTheDocument()
  })

  it('changes the main category of a work period', async () => {
    // Given a period on Work
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])

    // When the user picks another category for it
    await userEvent.selectOptions(await screen.findByLabelText(/main category of work period 1/i), 'Meeting')

    // Then the period carries that category
    await vi.waitFor(async () => {
      expect((await getWindows(repo))[0]?.category).toBe('Meeting')
    })
  })

  it('edits a subtask category, duration and note', async () => {
    // Given a period with a retro-logged Review subtask
    const { repo } = setup([period('a', '10:00', '13:00', 'Work', [{ id: 's1', category: 'Review', hours: 0.5 }])])

    // When the user opens the subtask and rewrites it
    await userEvent.click(await screen.findByRole('button', { name: /edit Review subtask/i }))
    await userEvent.clear(screen.getByLabelText(/subtask hours/i))
    await userEvent.type(screen.getByLabelText(/subtask hours/i), '1:00')
    await userEvent.selectOptions(screen.getByLabelText(/^category$/i), 'Meeting')
    await userEvent.type(screen.getByLabelText(/subtask note/i), 'pairing')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    // Then the subtask carries the new values
    await vi.waitFor(async () => {
      const [edited] = await getWindows(repo)
      expect(edited?.subtasks[0]).toMatchObject({ category: 'Meeting', hours: 1, note: 'pairing' })
    })
  })

  it('warns when subtasks overlap or exceed the work period', async () => {
    // Given two timed subtasks that overlap and together exceed the one-hour period
    setup([
      period('a', '10:00', '11:00', 'Work', [
        { id: 's1', category: 'Review', hours: 0.75, startedAt: '10:00', stoppedAt: '10:45' },
        { id: 's2', category: 'Meeting', hours: 0.75, startedAt: '10:30', stoppedAt: '11:15' },
      ]),
    ])

    // Then both problems are reported
    expect(await screen.findByText(/overlap/i)).toBeInTheDocument()
    expect(await screen.findByText(/exceed/i)).toBeInTheDocument()
  })

  it('summarises the day next to the timeline: worked, categories, start, breaks and desk time', async () => {
    // Given 2.5 hours of work with a half-hour break in between
    setup([period('a', '08:00', '09:30', 'Work'), period('b', '10:00', '11:00', 'Review')])

    // When the totals panel is read
    const panel = await screen.findByRole('complementary', { name: /day totals/i })

    // Then it carries the numbers the day is judged by
    await vi.waitFor(() => expect(panel).toHaveTextContent('2.50h'))
    expect(panel).toHaveTextContent('1.50h')
    expect(panel).toHaveTextContent('1.00h')
    expect(panel).toHaveTextContent('Work')
    expect(panel).toHaveTextContent('Review')
    expect(panel).toHaveTextContent('08:00')
    expect(panel).toHaveTextContent('11:00')
    expect(panel).toHaveTextContent('0.50h')
    expect(panel).toHaveTextContent('3.00h')
  })

  it('omits the totals panel where the host has no room for it', async () => {
    // Given the timeline embedded without totals, as in the month table dialog
    setup([period('a', '08:00', '09:30', 'Work')], false)

    // Then no panel is rendered
    expect(await screen.findByRole('list', { name: /day timeline/i })).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: /day totals/i })).not.toBeInTheDocument()
  })

  it('logs a whole work period on a day that is not today', async () => {
    // Given an empty past day, where "start tracking now" makes no sense
    const { repo } = setup([], true, PAST_DATE)

    // When the user writes down when they worked
    fireEvent.change(await screen.findByLabelText(/new work period start/i), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText(/new work period end/i), { target: { value: '17:00' } })
    await userEvent.selectOptions(screen.getByLabelText(/category for the new work period/i), 'Meeting')
    await userEvent.click(screen.getByRole('button', { name: /add work period/i }))

    // Then the period is stored on that day
    await vi.waitFor(async () => {
      expect(await getWindows(repo, PAST_DATE)).toMatchObject([{ start: '09:00', end: '17:00', category: 'Meeting' }])
    })

    // And live tracking is not offered for a day that is over
    expect(screen.queryByRole('button', { name: /start tracking/i })).not.toBeInTheDocument()
  })

  it('deletes a work period only after confirmation', async () => {
    // Given one work period
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])

    // When the user asks to delete it and cancels
    await userEvent.click(await screen.findByRole('button', { name: /delete work period/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    // Then it is still there
    expect(await getWindows(repo)).toHaveLength(1)

    // When the user confirms instead
    await userEvent.click(screen.getByRole('button', { name: /delete work period/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    // Then it is gone
    await vi.waitFor(async () => {
      expect(await getWindows(repo)).toHaveLength(0)
    })
  })

  it('deletes a subtask only after confirmation', async () => {
    // Given a period with a retro-logged subtask
    const { repo } = setup([period('a', '10:00', '13:00', 'Work', [{ id: 's1', category: 'Review', hours: 0.5 }])])

    // When the user deletes the subtask and confirms
    await userEvent.click(await screen.findByRole('button', { name: /remove Review subtask/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^delete$/i }))

    // Then the period keeps its hours but loses the subtask
    await vi.waitFor(async () => {
      const [kept] = await getWindows(repo)
      expect(kept?.subtasks).toHaveLength(0)
      expect(kept).toMatchObject({ start: '10:00', end: '13:00' })
    })
  })
})
