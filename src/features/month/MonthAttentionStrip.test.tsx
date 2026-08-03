import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MonthAttentionStrip } from './MonthAttentionStrip'
import type { AttentionDay } from './monthOverview'

const days: AttentionDay[] = [
  { date: '2026-07-02', dayOfMonth: 2, weekdayShort: 'Thu', reason: 'Nothing tracked' },
  { date: '2026-07-03', dayOfMonth: 3, weekdayShort: 'Fri', reason: 'Entries do not add up' },
]

describe('MonthAttentionStrip', () => {
  it('names every day that needs work and why', () => {
    render(<MonthAttentionStrip days={days} onSelectDate={vi.fn()} />)

    expect(screen.getByText(/2 days need attention/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thu 2.*Nothing tracked/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fri 3.*Entries do not add up/i })).toBeInTheDocument()
  })

  it('opens the day when its chip is clicked', async () => {
    const onSelectDate = vi.fn()
    render(<MonthAttentionStrip days={days} onSelectDate={onSelectDate} />)

    await userEvent.click(screen.getByRole('button', { name: /Fri 3/i }))
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-03')
  })

  it('renders nothing when the month is clean', () => {
    const { container } = render(<MonthAttentionStrip days={[]} onSelectDate={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
