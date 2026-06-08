import { render, screen, fireEvent, act } from '@testing-library/react'
import { NowChip } from './NowChip'

const FIXED_TIME = new Date('2026-06-04T14:32:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NowChip', () => {
  it('shows now pill with current time', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /now \(14:32\)/i })).toBeInTheDocument()
  })

  it('ticks to new time after 60 seconds', async () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /now \(14:32\)/i })).toBeInTheDocument()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    // Date advanced 60s from 14:32 → interval fires at 14:33
    expect(screen.getByRole('button', { name: /now \(14:33\)/i })).toBeInTheDocument()
  })

  it('clicking pill replaces it with a time input pre-filled with current time', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /now \(14:32\)/i }))
    expect(screen.queryByRole('button', { name: /now/i })).not.toBeInTheDocument()
    const input = screen.getByLabelText('Start')
    expect(input).toHaveAttribute('type', 'time')
    expect(input).toHaveValue('14:32')
  })

  it('changing time input calls onChange with new value', () => {
    const onChange = vi.fn()
    render(<NowChip aria-label="Start" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /now \(14:32\)/i }))
    const input = screen.getByLabelText('Start')
    fireEvent.change(input, { target: { value: '09:00' } })
    expect(onChange).toHaveBeenCalledWith('09:00')
  })
})
