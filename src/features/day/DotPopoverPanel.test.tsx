import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { DotPopoverPanel } from './DotPopoverPanel'
import type { DotPopoverState } from './DotPopoverPanel'

const state: DotPopoverState = {
  date: '2026-06-04',
  currentDayType: 'WorkDay',
  top: 100,
  left: 200,
  displayStatus: 'complete',
  reason: 'All hours booked',
}

function setup(stateOverride: DotPopoverState | null = state) {
  const ref = createRef<HTMLDivElement>()
  const onSelectDayType = vi.fn()
  render(<DotPopoverPanel state={stateOverride} popoverRef={ref} onSelectDayType={onSelectDayType} />)
  return { onSelectDayType }
}

describe('DotPopoverPanel', () => {
  it('renders nothing when state is null', () => {
    setup(null)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders all 5 day type buttons', () => {
    setup()
    expect(screen.getByRole('button', { name: /work day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vacation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sick day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /public holiday/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /absence/i })).toBeInTheDocument()
  })

  it('active day type button has highlighted class', () => {
    setup()
    expect(screen.getByRole('button', { name: /work day/i }).className).toContain('bg-indigo-600')
  })

  it('inactive day type buttons do not have highlighted class', () => {
    setup()
    expect(screen.getByRole('button', { name: /vacation/i }).className).not.toContain('bg-indigo-600')
  })

  it('clicking a button calls onSelectDayType with its value', async () => {
    const { onSelectDayType } = setup()
    await userEvent.click(screen.getByRole('button', { name: /vacation/i }))
    expect(onSelectDayType).toHaveBeenCalledWith('Vacation')
  })

  it('shows status label', () => {
    setup()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })

  it('shows reason text', () => {
    setup()
    expect(screen.getByText('All hours booked')).toBeInTheDocument()
  })
})
