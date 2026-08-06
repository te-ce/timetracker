import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'
import { buildMonthOverview } from './monthOverview'
import type { DaySummary } from './daySummary'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { DaySummaryData } from '../../shared/DaySummaryBody'

describe('MonthCalendar', () => {
  it('renders all days of the given month', () => {
    // January 2024 has 31 days
    render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} />)
    for (let d = 1; d <= 31; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument()
    }
  })

  it('calls onSelectDate when a day is clicked', async () => {
    const onSelectDate = vi.fn()
    render(<MonthCalendar year={2024} month={0} onSelectDate={onSelectDate} />)
    await userEvent.click(screen.getByText('15'))
    expect(onSelectDate).toHaveBeenCalledWith('2024-01-15')
  })

  it('applies correct status colors from dayStatusMap', () => {
    // May 2026: day 17=Sat, 18=Sun, 19=Tue
    const dayStatusMap: Record<string, DayStatus> = {
      '2026-05-17': 'non-working', // Saturday
      '2026-05-18': 'non-working', // Sunday
      '2026-05-19': 'today', // Tuesday
      '2026-05-15': 'complete', // Friday (work day with hours)
      '2026-05-16': 'untracked', // Past Friday without hours
      '2026-05-20': 'future', // Wednesday
    }
    render(<MonthCalendar year={2026} month={4} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)

    function btn(text: string) {
      return screen.getByText(text).closest('button')!
    }

    // Saturday + Sunday get non-working style (gray)
    expect(btn('17').className).toContain('bg-gray-100')
    expect(btn('18').className).toContain('bg-gray-100')
    // Tuesday (today status) gets white bg
    expect(btn('19').className).toContain('bg-white')
    // Tracked gets emerald
    expect(btn('15').className).toContain('bg-emerald-100')
    // Untracked gets blue
    expect(btn('16').className).toContain('bg-blue-100')
    // Future is faded
    expect(btn('20').className).toContain('bg-gray-50/60')
  })

  it('gives every day the same rectangle, whatever it holds', () => {
    const overview = buildMonthOverview({
      days: [
        {
          date: '2026-05-19',
          dayType: 'WorkDay',
          workedHours: 9.5,
          targetHours: 8,
          entryTotal: 0,
          dayStatus: 'complete',
          displayStatus: 'complete',
          statusReason: '',
          categoryBreakdown: {},
        },
      ],
      targetHoursPerDay: [8],
      today: '2026-05-31',
      cumulativeBalance: 0,
    })
    render(
      <MonthCalendar
        year={2026}
        month={4}
        onSelectDate={vi.fn()}
        dayStatusMap={{ '2026-05-19': 'complete', '2026-05-23': 'non-working' }}
        overview={overview}
      />,
    )

    // A cell with hours, a bar and a delta, and an empty weekend cell, are the same size.
    const full = screen.getByRole('button', { name: /Tuesday, 19 May 2026/i })
    const empty = screen.getByRole('button', { name: /Saturday, 23 May 2026/i })
    const sizeClasses = (el: HTMLElement) => el.className.split(' ').filter((c) => c.startsWith('min-h-'))

    expect(sizeClasses(full)).toHaveLength(1)
    expect(sizeClasses(empty)).toEqual(sizeClasses(full))
  })

  describe('today', () => {
    function todayCell(dayDisplayStatusMap?: Record<string, DisplayStatus>) {
      render(
        <MonthCalendar
          year={2026}
          month={4}
          onSelectDate={vi.fn()}
          dayStatusMap={{ '2026-05-19': 'today' }}
          {...(dayDisplayStatusMap ? { dayDisplayStatusMap } : {})}
        />,
      )
      return screen.getByRole('button', { name: /Tuesday, 19 May 2026/i })
    }

    it("wears its own status color, so today's progress is visible, plus an amber ring", () => {
      const cell = todayCell({ '2026-05-19': 'complete' })

      expect(cell.className).toContain('bg-emerald-100')
      expect(cell.className).toContain('ring-amber-500')
    })

    it('says so in words, not only in color', () => {
      expect(todayCell({ '2026-05-19': 'complete' }).textContent).toContain('Today')
    })

    it('keeps the ring on a neutral cell while its status is still unknown', () => {
      const cell = todayCell()

      expect(cell.className).toContain('bg-white')
      expect(cell.className).toContain('ring-amber-500')
    })

    it('stands apart from a day that has not happened yet', () => {
      render(
        <MonthCalendar
          year={2026}
          month={4}
          onSelectDate={vi.fn()}
          dayStatusMap={{ '2026-05-19': 'today', '2026-05-20': 'future' }}
          dayDisplayStatusMap={{ '2026-05-19': 'untracked' }}
        />,
      )
      const today = screen.getByRole('button', { name: /Tuesday, 19 May 2026/i })
      const future = screen.getByRole('button', { name: /Wednesday, 20 May 2026/i })

      // A future day recedes: faded, no ring — but its border stays solid like every other cell.
      expect(future.className).toContain('bg-gray-50/60')
      expect(future.className).not.toContain('border-dashed')
      expect(future.className).not.toContain('ring-amber')
      expect(future.className).not.toBe(today.className)
    })
  })

  it('actual today gets orange circle indicator', () => {
    const today = new Date()
    render(<MonthCalendar year={today.getFullYear()} month={today.getMonth()} onSelectDate={vi.fn()} />)

    const circle = screen.getByText(String(today.getDate()))
    expect(circle.tagName).toBe('SPAN')
    expect(circle.className).toContain('rounded-full')
    expect(circle.className).toContain('bg-orange-400')
  })

  it('uses local date for onSelectDate regardless of timezone', async () => {
    const onSelectDate = vi.fn()
    render(<MonthCalendar year={2026} month={4} onSelectDate={onSelectDate} />)
    await userEvent.click(screen.getByText('19'))
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-19')
  })

  it('does not render the status legend', () => {
    render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} />)
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument()
    expect(screen.queryByText('Non-working')).not.toBeInTheDocument()
  })

  describe('status dots', () => {
    function dotsIn(el: HTMLElement) {
      const button = el instanceof HTMLButtonElement ? el : (el.closest('button') ?? el)
      return button.querySelectorAll('span.h-1.rounded-full')
    }

    it('every day shows one dot for its status color', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'complete' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'complete' }
      render(
        <MonthCalendar
          year={2024}
          month={0}
          onSelectDate={vi.fn()}
          dayStatusMap={dayStatusMap}
          dayDisplayStatusMap={dayDisplayStatusMap}
        />,
      )
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-emerald-500')
    })

    it('today shows only the displayStatus dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'untracked' }
      render(
        <MonthCalendar
          year={2024}
          month={0}
          onSelectDate={vi.fn()}
          dayStatusMap={dayStatusMap}
          dayDisplayStatusMap={dayDisplayStatusMap}
        />,
      )
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-blue-300')
    })

    it('today shows displayStatus dot when displayStatus is complete', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'complete' }
      render(
        <MonthCalendar
          year={2024}
          month={0}
          onSelectDate={vi.fn()}
          dayStatusMap={dayStatusMap}
          dayDisplayStatusMap={dayDisplayStatusMap}
        />,
      )
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-emerald-500')
    })

    it('days without a status map entry show a future dot', () => {
      render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} />)
      const dots = dotsIn(screen.getByText('10'))
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-gray-200')
    })

    it('each status maps to its correct dot color', () => {
      const cases: [DayStatus & DisplayStatus, string][] = [
        ['complete', 'bg-emerald-500'],
        ['needs-review', 'bg-red-400'],
        ['leave', 'bg-purple-400'],
        ['non-working', 'bg-gray-400'],
        ['untracked', 'bg-blue-300'],
      ]
      for (const [status, expectedClass] of cases) {
        const dayStatusMap: Record<string, DayStatus> = { '2024-01-10': status }
        const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-10': status }
        const { unmount } = render(
          <MonthCalendar
            year={2024}
            month={0}
            onSelectDate={vi.fn()}
            dayStatusMap={dayStatusMap}
            dayDisplayStatusMap={dayDisplayStatusMap}
          />,
        )
        const dots = dotsIn(screen.getByText('10'))
        expect(dots).toHaveLength(1)
        expect(dots[0]!.className).toContain(expectedClass)
        unmount()
      }
    })

    it('complete day gets light emerald cell and emerald dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'complete' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'complete' }
      render(
        <MonthCalendar
          year={2024}
          month={0}
          onSelectDate={vi.fn()}
          dayStatusMap={dayStatusMap}
          dayDisplayStatusMap={dayDisplayStatusMap}
        />,
      )
      const button = screen.getByText('15').closest('button')!
      expect(button.className).toContain('bg-emerald-100')
      const dots = dotsIn(button)
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-emerald-500')
    })

    it('today without dayDisplayStatusMap shows no dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(0)
    })
  })

  describe('ledger cells', () => {
    function overviewFor(days: DaySummary[], targetHoursPerDay: number[], today: string) {
      return buildMonthOverview({ days, targetHoursPerDay, today, cumulativeBalance: 0 })
    }

    function workDay(date: string, workedHours: number): DaySummary {
      return {
        date,
        dayType: 'WorkDay',
        workedHours,
        targetHours: 8,
        entryTotal: 0,
        dayStatus: 'complete',
        displayStatus: 'complete',
        statusReason: '',
        categoryBreakdown: {},
      }
    }

    it('shows worked hours and the overtime-to-date inside the cell', () => {
      const overview = overviewFor([workDay('2026-07-01', 9.5)], [8], '2026-07-31')
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      const cell = screen.getByRole('button', { name: /Wednesday, 1 July 2026/i })
      expect(cell.textContent).toContain('9.50h')
      expect(cell.textContent).toContain('+1.50h')
    })

    it('shows a week total column with the ISO week, its hours and its overtime-to-date', () => {
      const overview = overviewFor([workDay('2026-07-01', 9), workDay('2026-07-02', 6)], [8, 8], '2026-07-31')
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      expect(screen.getByText('KW 27')).toBeInTheDocument()
      expect(screen.getByText('15.00h')).toBeInTheDocument()
      // Day 2 lands on -1 too (its own cumulative overtime as of that day), same as the week's.
      expect(screen.getAllByText('−1.00h')).toHaveLength(2)
    })

    it('names the leave instead of leaving a vacation cell blank', () => {
      const vacation: DaySummary = {
        ...workDay('2026-07-01', 0),
        dayType: 'Vacation',
        dayStatus: 'leave',
        displayStatus: 'leave',
        leaveType: 'Vacation',
      }
      const overview = overviewFor([vacation], [8], '2026-07-31')
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      expect(screen.getByRole('button', { name: /Wednesday, 1 July 2026/i }).textContent).toContain('Vacation')
    })

    it('leaves a week that has not happened yet without totals', () => {
      const overview = overviewFor(
        [workDay('2026-07-01', 9), { ...workDay('2026-07-06', 0), dayStatus: 'future', displayStatus: 'future' }],
        [8, 8],
        '2026-07-01',
      )
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      // The past week reports itself (once in the day cell, once as the week total);
      // the coming week shows its number only.
      expect(screen.getByText('KW 27')).toBeInTheDocument()
      expect(screen.getAllByText('9.00h')).toHaveLength(2)
      expect(screen.getByText('KW 28')).toBeInTheDocument()
      expect(screen.queryByText('0.00h')).not.toBeInTheDocument()
    })

    it('still shows the running overtime-to-date on a day with nothing tracked', () => {
      const untracked: DaySummary = { ...workDay('2026-07-01', 0), dayStatus: 'untracked', displayStatus: 'untracked' }
      const overview = buildMonthOverview({
        days: [untracked],
        targetHoursPerDay: [8],
        today: '2026-07-31',
        cumulativeBalance: -3,
      })
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      const cell = screen.getByRole('button', { name: /Wednesday, 1 July 2026/i })
      expect(cell.textContent).toContain('−3.00h')
    })

    it('leaves a future day without an overtime-to-date', () => {
      const future: DaySummary = { ...workDay('2026-07-01', 0), dayStatus: 'future', displayStatus: 'future' }
      const overview = overviewFor([future], [8], '2026-06-30')
      render(<MonthCalendar year={2026} month={6} onSelectDate={vi.fn()} overview={overview} />)

      const cell = screen.getByRole('button', { name: /Wednesday, 1 July 2026/i })
      expect(cell.textContent).not.toContain('0.00h')
      expect(cell.textContent).not.toContain('-8.00h')
    })
  })

  it('shows a reason tooltip element when daySummaryDataMap has entry', () => {
    const dayStatusMap: Record<string, DayStatus> = { '2024-01-10': 'complete' }
    const daySummaryDataMap: Record<string, DaySummaryData> = {
      '2024-01-10': {
        displayStatus: 'complete',
        reason: 'Holiday: New Year',
        workedHours: 8,
        categoryBreakdown: {},
      },
    }
    render(
      <MonthCalendar
        year={2024}
        month={0}
        onSelectDate={vi.fn()}
        dayStatusMap={dayStatusMap}
        daySummaryDataMap={daySummaryDataMap}
      />,
    )
    fireEvent.mouseEnter(screen.getByRole('button', { name: /10 january 2024/i }))
    expect(screen.getByText('Holiday: New Year')).toBeInTheDocument()
  })
})
