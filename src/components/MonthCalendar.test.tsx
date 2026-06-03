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

  it('wraps from January to December of prior year on prev click', async () => {
    const onMonthChange = vi.fn()
    render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2023, 11)
  })

  it('wraps from December to January of next year on next click', async () => {
    const onMonthChange = vi.fn()
    render(<MonthCalendar year={2024} month={11} onSelectDate={vi.fn()} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2025, 0)
  })

  it('does nothing on prev/next when onMonthChange is not provided', async () => {
    render(<MonthCalendar year={2024} month={5} onSelectDate={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/june/i)).toBeInTheDocument()
  })

  it('clicking Today button calls onMonthChange with current month', async () => {
    const onMonthChange = vi.fn()
    render(<MonthCalendar year={2024} month={0} onSelectDate={vi.fn()} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /current month/i }))
    const now = new Date()
    expect(onMonthChange).toHaveBeenCalledWith(now.getFullYear(), now.getMonth())
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
