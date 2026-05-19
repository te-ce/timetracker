import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthCalendar } from './MonthCalendar'

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
})
