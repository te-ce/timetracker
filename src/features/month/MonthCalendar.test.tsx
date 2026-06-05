import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'

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

    const day17 = screen.getByText('17')
    const day18 = screen.getByText('18')
    const day19 = screen.getByText('19')
    const day15 = screen.getByText('15')
    const day16 = screen.getByText('16')
    const day20 = screen.getByText('20')

    // Saturday + Sunday get non-working style (gray)
    expect(day17.className).toContain('bg-gray-100')
    expect(day18.className).toContain('bg-gray-100')
    // Tuesday (today) gets white bg + orange ring
    expect(day19.className).toContain('bg-white')
    expect(day19.className).toContain('ring-2')
    // Tracked gets emerald
    expect(day15.className).toContain('bg-emerald-100')
    // Untracked gets blue
    expect(day16.className).toContain('bg-blue-100')
    // Future gets white
    expect(day20.className).toContain('bg-white')
  })

  it('applies today ring indicator', () => {
    const dayStatusMap: Record<string, DayStatus> = {
      '2026-05-19': 'today',
    }
    render(<MonthCalendar year={2026} month={4} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)

    const day19 = screen.getByText('19')
    expect(day19.className).toContain('ring-2')
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
    function dotsIn(button: HTMLElement) {
      return button.querySelectorAll('span.rounded-full')
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
      expect(dots[0].className).toContain('bg-emerald-500')
    })

    it('today shows two dots — orange then displayStatus color', () => {
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
      expect(dots).toHaveLength(2)
      expect(dots[0].className).toContain('bg-orange-400')
      expect(dots[1].className).toContain('bg-blue-300')
    })

    it('today shows two dots when displayStatus is complete', () => {
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
      expect(dots).toHaveLength(2)
      expect(dots[0].className).toContain('bg-orange-400')
      expect(dots[1].className).toContain('bg-emerald-500')
    })

    it('days without a status map entry show a future dot', () => {
      render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} />)
      const dots = dotsIn(screen.getByText('10'))
      expect(dots).toHaveLength(1)
      expect(dots[0].className).toContain('bg-gray-200')
    })

    it('each status maps to its correct dot color', () => {
      const cases: [DayStatus & DisplayStatus, string][] = [
        ['confirmed', 'bg-emerald-500'],
        ['complete', 'bg-emerald-500'],
        ['needs-review', 'bg-yellow-400'],
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
        expect(dots[0].className).toContain(expectedClass)
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
      const button = screen.getByText('15')
      expect(button.className).toContain('bg-emerald-100')
      expect(button.textContent).toContain('✓')
      const dots = dotsIn(button)
      expect(dots).toHaveLength(1)
      expect(dots[0].className).toContain('bg-emerald-500')
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
      expect(screen.getByText('15').textContent).toContain('✓')
    })

    it('today without dayDisplayStatusMap shows only the orange dot', () => {
      const dayStatusMap: Record<string, DayStatus> = { '2024-01-15': 'today' }
      render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)
      const dots = dotsIn(screen.getByText('15'))
      expect(dots).toHaveLength(1)
      expect(dots[0].className).toContain('bg-orange-400')
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

  it('shows a reason tooltip element when dayStatusReasonMap has entry', () => {
    const dayStatusMap: Record<string, DayStatus> = { '2024-01-10': 'complete' }
    const dayStatusReasonMap = { '2024-01-10': 'Holiday: New Year' }
    render(
      <MonthCalendar
        year={2024}
        month={0}
        onSelectDate={vi.fn()}
        dayStatusMap={dayStatusMap}
        dayStatusReasonMap={dayStatusReasonMap}
      />,
    )
    expect(screen.getByText('Holiday: New Year')).toBeInTheDocument()
  })
})
