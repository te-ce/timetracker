import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'
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
    // Future gets white
    expect(btn('20').className).toContain('bg-white')
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
        ['confirmed', 'bg-emerald-500'],
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

    it('confirmed day gets light emerald cell, checkmark overlay, and emerald dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'confirmed' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'confirmed' }
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
      expect(button.textContent).toContain('✓')
      const dots = dotsIn(button)
      expect(dots).toHaveLength(1)
      expect(dots[0]!.className).toContain('bg-emerald-500')
    })

    it('today with confirmed displayStatus shows checkmark overlay', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-15': 'confirmed' }
      render(
        <MonthCalendar
          year={2024}
          month={0}
          onSelectDate={vi.fn()}
          dayStatusMap={dayStatusMap}
          dayDisplayStatusMap={dayDisplayStatusMap}
        />,
      )
      expect(screen.getByText('15').closest('button')!.textContent).toContain('✓')
    })

    it('today without dayDisplayStatusMap shows no dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(0)
    })

    it('non-confirmed displayStatus does not show checkmark', () => {
      const statuses: DisplayStatus[] = ['complete', 'needs-review', 'untracked', 'future']
      for (const displayStatus of statuses) {
        const dayStatusMap: Record<string, DayStatus> = { '2024-01-10': displayStatus }
        const dayDisplayStatusMap: Record<string, DisplayStatus> = { '2024-01-10': displayStatus }
        const { unmount } = render(
          <MonthCalendar
            year={2024}
            month={0}
            onSelectDate={vi.fn()}
            dayStatusMap={dayStatusMap}
            dayDisplayStatusMap={dayDisplayStatusMap}
          />,
        )
        expect(screen.getByText('10').textContent).not.toContain('✓')
        unmount()
      }
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
