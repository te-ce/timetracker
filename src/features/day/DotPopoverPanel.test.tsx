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
  reason: '8.0 h worked',
  workedHours: 8.0,
  categoryBreakdown: { ProjectX: 5.0, Support: 3.0 },
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

  it('renders all day type buttons (no Absence)', () => {
    setup()
    expect(screen.getByRole('button', { name: /work day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vacation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sick day/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /public holiday/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /absence/i })).not.toBeInTheDocument()
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

  it('shows reason text inline with status', () => {
    setup()
    expect(screen.getByText('8.0 h worked')).toBeInTheDocument()
  })

  it('shows total worked hours in summary', () => {
    setup()
    expect(screen.getByText(/8\.00 total/i)).toBeInTheDocument()
  })

  it('shows per-category hours', () => {
    setup()
    expect(screen.getByText('ProjectX')).toBeInTheDocument()
    expect(screen.getByText('5.00')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('3.00')).toBeInTheDocument()
  })

  it('shows category description in parentheses when provided', () => {
    setup({ ...state, categoryDescriptions: { ProjectX: 'Client work' } })
    expect(screen.getByText('ProjectX (Client work)')).toBeInTheDocument()
  })

  it('hides hours section when no hours worked', () => {
    setup({ ...state, workedHours: 0, categoryBreakdown: {} })
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument()
  })

  it('shows leave type label for vacation in status row (not just as day type button)', () => {
    setup({ ...state, displayStatus: 'leave', leaveType: 'Vacation', workedHours: 0, categoryBreakdown: {} })
    const explanations = screen.getAllByText(/vacation/i)
    // Both the explanation paragraph and the day type button should be present
    expect(explanations.length).toBeGreaterThanOrEqual(2)
  })

  it('shows leave type label for sick day in status row', () => {
    setup({ ...state, displayStatus: 'leave', leaveType: 'SickDay', workedHours: 0, categoryBreakdown: {} })
    const explanations = screen.getAllByText(/sick day/i)
    expect(explanations.length).toBeGreaterThanOrEqual(2)
  })
})
