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
  it('shows time input immediately without any click', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Start')).toHaveAttribute('type', 'time')
  })

  it('shows "now" pill in active state by default', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    const pill = screen.getByRole('button', { name: /now/i })
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveAttribute('aria-pressed', 'true')
  })

  it('input value equals current time when now is active', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Start')).toHaveValue('14:32')
  })

  it('input tracks ticking clock while now is active', async () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Start')).toHaveValue('14:32')
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByLabelText('Start')).toHaveValue('14:33')
  })

  it('editing input deactivates now pill', () => {
    render(<NowChip aria-label="Start" onChange={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '09:00' } })
    expect(screen.getByRole('button', { name: /now/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('editing input calls onChange with new value', () => {
    const onChange = vi.fn()
    render(<NowChip aria-label="Start" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '09:00' } })
    expect(onChange).toHaveBeenCalledWith('09:00')
  })

  it('clicking inactive now pill reactivates it and restores current time', () => {
    const onChange = vi.fn()
    render(<NowChip aria-label="Start" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: /now/i }))
    expect(screen.getByRole('button', { name: /now/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Start')).toHaveValue('14:32')
    expect(onChange).toHaveBeenLastCalledWith('14:32')
  })
})
