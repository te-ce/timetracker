import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { MonthNav } from './MonthNav'

describe('MonthNav', () => {
  it('renders month name and year', () => {
    render(<MonthNav year={2024} month={0} />)
    expect(screen.getByText(/january 2024/i)).toBeInTheDocument()
  })

  it('navigates to previous and next month', async () => {
    const onMonthChange = vi.fn()
    render(<MonthNav year={2024} month={0} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2024, 1)
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2023, 11)
  })

  it('wraps from January to December of prior year on prev click', async () => {
    const onMonthChange = vi.fn()
    render(<MonthNav year={2024} month={0} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2023, 11)
  })

  it('wraps from December to January of next year on next click', async () => {
    const onMonthChange = vi.fn()
    render(<MonthNav year={2024} month={11} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onMonthChange).toHaveBeenCalledWith(2025, 0)
  })

  it('does nothing on prev/next when onMonthChange is not provided', async () => {
    render(<MonthNav year={2024} month={5} />)
    await userEvent.click(screen.getByRole('button', { name: /prev/i }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/june 2024/i)).toBeInTheDocument()
  })

  it('clicking Today button calls onMonthChange with current month', async () => {
    const onMonthChange = vi.fn()
    render(<MonthNav year={2024} month={0} onMonthChange={onMonthChange} />)
    await userEvent.click(screen.getByRole('button', { name: /current month/i }))
    const now = new Date()
    expect(onMonthChange).toHaveBeenCalledWith(now.getFullYear(), now.getMonth())
  })

  describe('compact mode', () => {
    it('heading uses smaller text class when compact', () => {
      render(<MonthNav year={2024} month={0} compact />)
      const heading = screen.getByRole('heading')
      expect(heading.className).toMatch(/text-sm/)
      expect(heading.className).not.toMatch(/text-lg/)
    })

    it('heading uses normal text class when not compact', () => {
      render(<MonthNav year={2024} month={0} />)
      const heading = screen.getByRole('heading')
      expect(heading.className).toMatch(/text-lg/)
    })
  })
})
