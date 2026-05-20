import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'
import type { DayStatus } from '../domain/dayStatus'

describe('MonthCalendar', () => {
  it('renders all days of the given month', () => {
    // January 2024 has 31 days
    render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} />)
    for (let d = 1; d <= 31; d++) {
      expect(screen.getByText(String(d))).toBeInTheDocument()
    }
  })

  it('navigates to previous and next month', async () => {
    const { rerender } = render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} onMonthChange={vi.fn()} />)
    // Verify January shown
    expect(screen.getByText(/january/i)).toBeInTheDocument()

    // Click next
    const onMonthChange = vi.fn()
    rerender(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2024, 1)

    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2023, 11)
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
      '2026-05-17': 'non-working',  // Saturday
      '2026-05-18': 'non-working',  // Sunday
      '2026-05-19': 'today',        // Tuesday
      '2026-05-15': 'tracked',      // Friday (work day with hours)
      '2026-05-16': 'untracked',    // Past Friday without hours
      '2026-05-20': 'future',       // Wednesday
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
    // Tuesday (today) gets blue
    expect(day19.className).toContain('bg-blue-100')
    // Tracked gets emerald
    expect(day15.className).toContain('bg-emerald-100')
    // Untracked gets red
    expect(day16.className).toContain('bg-red-100')
    // Future gets white
    expect(day20.className).toContain('bg-white')
  })

  it('applies hatched style for today', () => {
    const dayStatusMap: Record<string, DayStatus> = {
      '2026-05-19': 'today',
    }
    render(<MonthCalendar year={2026} month={4} onSelectDate={vi.fn()} dayStatusMap={dayStatusMap} />)

    const day19 = screen.getByText('19')
    // Gets today's blue base + ring
    expect(day19.className).toContain('bg-blue-100')
    expect(day19.className).toContain('ring-2')
    // Gets hatched inline style
    expect(day19).toHaveStyle({ backgroundImage: expect.stringContaining('repeating-linear-gradient') })
  })

  it('uses local date for onSelectDate regardless of timezone', async () => {
    // This test verifies toLocalIso is used (not toISOString which shifts in UTC+)
    const onSelectDate = vi.fn()
    render(<MonthCalendar year={2026} month={4} onSelectDate={onSelectDate} />)
    await userEvent.click(screen.getByText('19'))
    // Must be local May 19, not UTC-shifted May 18
    expect(onSelectDate).toHaveBeenCalledWith('2026-05-19')
  })
})
