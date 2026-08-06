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
// these tests run against today — but at a pinned wall-clock time. Left on the
// real clock, the fixtures' 08:00–17:00 periods are still in the future when the
// suite runs in the morning, and a period that hasn't started has no elapsed
// stretch to render.
const PINNED_NOW = (() => {
  const d = new Date()
  d.setHours(18, 30, 0, 0)
  return d
})()
const DATE = toLocalIso(PINNED_NOW)
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
  return setupWithRepo(repo, showTotals, date)
}

function setupWithRepo<R extends MonthRepository>(repo: R, showTotals = true, date = DATE) {
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
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(PINNED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('defaults the start category to whichever has the most all-time hours booked when no auto category is set', async () => {
    // Given a day with nothing tracked, but a prior month heavy on Review
    const repo = new InMemoryMonthRepository({
      '2026-04': {
        '2026-04-01': { windows: [period('a', '09:00', '10:00', 'Meeting')] },
        '2026-04-02': { windows: [period('b', '09:00', '14:00', 'Review')] },
      },
    })
    setupWithRepo(repo)

    // When the user starts tracking without touching the category picker
    await userEvent.click(await screen.findByRole('button', { name: /start tracking/i }))

    // Then the new period is booked on the category with the most all-time hours
    await vi.waitFor(async () => {
      expect(await getWindows(repo)).toMatchObject([{ end: null, category: 'Review' }])
    })
  })

  it('starts an open work period at a manually chosen start time', async () => {
    // Given a day with nothing tracked
    const { repo } = setup()

    // When the user opens the start-time editor and sets a custom time
    await userEvent.click(await screen.findByRole('button', { name: /edit start time/i }))
    fireEvent.change(screen.getByLabelText(/^start time$/i), { target: { value: '07:15' } })
    await userEvent.click(screen.getByRole('button', { name: /start tracking/i }))

    // Then the open WorkPeriod begins at that time
    await vi.waitFor(async () => {
      expect(await getWindows(repo)).toMatchObject([{ start: '07:15', end: null }])
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

    // When the user picks a different category and starts a subtask
    await userEvent.selectOptions(await screen.findByLabelText(/subtask category/i), 'Review')
    await userEvent.click(screen.getByRole('button', { name: /start subtask/i }))

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

  it('starts a live subtask at a manually chosen start time', async () => {
    // Given work running on Work
    const { repo } = setup([period('a', '09:00', null, 'Work')])

    // When the user opens the subtask start-time editor and sets a custom time
    await userEvent.selectOptions(await screen.findByLabelText(/subtask category/i), 'Review')
    await userEvent.click(screen.getByRole('button', { name: /edit subtask start time/i }))
    fireEvent.change(screen.getByLabelText(/^subtask start time$/i), { target: { value: '10:45' } })
    await userEvent.click(screen.getByRole('button', { name: /start subtask/i }))

    // Then the live subtask begins at that time
    await vi.waitFor(async () => {
      const [tracked] = await getWindows(repo)
      expect(tracked?.subtasks).toMatchObject([{ category: 'Review', startedAt: '10:45' }])
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
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Review subtask' }))
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

  it('opens and focuses the work period’s time editor when its main stretch time is clicked', async () => {
    // Given a finished work period with no subtasks
    setup([period('a', '08:00', '09:30', 'Work')])

    // When the user clicks the time on the main stretch row
    await userEvent.click(await screen.findByRole('button', { name: /edit work period times 08:00–09:30/i }))

    // Then the work period's own time editor is open with the start time focused
    expect(screen.getByLabelText(/work period 1 start/i)).toHaveFocus()
    expect(screen.getByLabelText(/work period 1 end/i)).toBeInTheDocument()
  })

  it('focuses the start time when the work period title time is clicked', async () => {
    // Given a finished work period
    setup([period('a', '08:00', '09:30', 'Work')])

    // When the title time is clicked
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))

    // Then typing goes straight into the start time
    expect(screen.getByLabelText(/work period 1 start/i)).toHaveFocus()
  })

  it('saves work period times on Enter and abandons them on Escape', async () => {
    // Given a finished work period
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])

    // When the user types a new start and presses Escape
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    fireEvent.change(screen.getByLabelText(/work period 1 start/i), { target: { value: '07:00' } })
    await userEvent.keyboard('{Escape}')

    // Then nothing is stored and the editor is closed
    expect(await getWindows(repo)).toMatchObject([{ start: '08:00' }])
    expect(screen.queryByLabelText(/work period 1 start/i)).not.toBeInTheDocument()

    // When the user types a new start and presses Enter
    await userEvent.click(screen.getByRole('button', { name: /edit times of work period 1/i }))
    fireEvent.change(screen.getByLabelText(/work period 1 start/i), { target: { value: '07:00' } })
    await userEvent.keyboard('{Enter}')

    // Then it is stored
    await vi.waitFor(async () => {
      expect((await getWindows(repo))[0]).toMatchObject({ start: '07:00', end: '09:30' })
    })
  })

  it('abandons an untouched work period time edit as soon as focus leaves it', async () => {
    // Given the work period time editor is open and unchanged
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    expect(screen.getByLabelText(/work period 1 start/i)).toHaveFocus()

    // When focus moves away
    await userEvent.click(document.body)

    // Then the editor is gone and nothing was written
    await vi.waitFor(() => {
      expect(screen.queryByLabelText(/work period 1 start/i)).not.toBeInTheDocument()
    })
    expect(await getWindows(repo)).toMatchObject([{ start: '08:00', end: '09:30' }])
  })

  it('can reopen the work period time editor after focus dropped it', async () => {
    // Given an editor that was abandoned by clicking away
    setup([period('a', '08:00', '09:30', 'Work')])
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    await userEvent.click(document.body)
    await vi.waitFor(() => {
      expect(screen.queryByLabelText(/work period 1 start/i)).not.toBeInTheDocument()
    })

    // When the time is clicked again
    await userEvent.click(screen.getByRole('button', { name: /edit times of work period 1/i }))

    // Then the editor is back and focused
    expect(await screen.findByLabelText(/work period 1 start/i)).toHaveFocus()

    // And it can be abandoned and reopened again from the main stretch time
    await userEvent.click(document.body)
    await userEvent.click(screen.getByRole('button', { name: /edit work period times 08:00–09:30/i }))
    expect(await screen.findByLabelText(/work period 1 start/i)).toHaveFocus()
  })

  it('warns before throwing away a changed work period time edit', async () => {
    // Given a pending change to the times
    const { repo } = setup([period('a', '08:00', '09:30', 'Work')])
    await userEvent.click(await screen.findByRole('button', { name: /edit times of work period 1/i }))
    fireEvent.change(screen.getByLabelText(/work period 1 start/i), { target: { value: '07:00' } })

    // When focus leaves once, the edit survives and says what a second click will do
    await userEvent.click(document.body)
    expect(await screen.findByText(/click outside again to cancel/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/work period 1 start/i)).toBeInTheDocument()

    // When focus leaves again, the change is dropped
    await userEvent.click(document.body)
    await vi.waitFor(() => {
      expect(screen.queryByLabelText(/work period 1 start/i)).not.toBeInTheDocument()
    })
    expect(await getWindows(repo)).toMatchObject([{ start: '08:00' }])
  })

  it('edits a subtask inline when its time is clicked', async () => {
    // Given a period with a timed Review subtask
    const { repo } = setup([
      period('a', '10:00', '13:00', 'Work', [
        { id: 's1', category: 'Review', hours: 0.5, startedAt: '11:00', stoppedAt: '11:30' },
      ]),
    ])

    // When the user clicks the subtask's time
    await userEvent.click(await screen.findByRole('button', { name: /edit Review subtask times/i }))

    // Then the subtask's own times are editable in place, end time focused
    expect(screen.getByLabelText(/subtask end time/i)).toHaveFocus()
    fireEvent.change(screen.getByLabelText(/subtask end time/i), { target: { value: '12:00' } })
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await vi.waitFor(async () => {
      const [edited] = await getWindows(repo)
      expect(edited?.subtasks[0]).toMatchObject({ startedAt: '11:00', stoppedAt: '12:00', hours: 1 })
    })
  })

  it('edits a retro-logged subtask’s duration when its empty time is clicked', async () => {
    // Given a subtask logged from memory, which has no times to click
    setup([period('a', '10:00', '13:00', 'Work', [{ id: 's1', category: '_MAINT', hours: 0.5 }])])

    // When its duration placeholder is clicked
    await userEvent.click(await screen.findByRole('button', { name: /edit _MAINT subtask duration/i }))

    // Then the duration field is focused
    expect(screen.getByLabelText(/subtask hours/i)).toHaveFocus()
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

  it('warns that a day is in the past when logging a work period on it', async () => {
    // Given an empty past day
    setup([], true, PAST_DATE)

    // Then a warning icon sits next to the add control, explaining why on hover
    const warning = await screen.findByLabelText(/this is a past day/i)
    await userEvent.hover(warning)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/this is a past day/i)
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
