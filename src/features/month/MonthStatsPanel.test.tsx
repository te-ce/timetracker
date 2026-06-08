import { render, screen } from '@testing-library/react'
import { MonthStatsPanel } from './MonthStatsPanel'

describe('MonthStatsPanel', () => {
  it('shows positive overtime with + prefix', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[9]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={0}
        today="2024-01-15"
      />,
    )
    expect(screen.getByText(/\+/)).toBeInTheDocument()
  })

  it('shows undertime with negative value', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[6]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={0}
        today="2024-01-15"
      />,
    )
    expect(screen.getByText(/-2\.00h/)).toBeInTheDocument()
  })

  it('includes carry-over in cumulative overtime', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[8]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={5}
        today="2024-01-15"
      />,
    )
    expect(screen.getByText('+5.00h')).toBeInTheDocument()
  })

  it('shows hours needed today when work is remaining', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[3]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={0}
        today="2024-01-15"
      />,
    )
    expect(screen.getByText('5.00h')).toBeInTheDocument()
  })

  it('shows zero needed when day is complete', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[8]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={0}
        today="2024-01-15"
      />,
    )
    expect(screen.getByText('0.00h')).toBeInTheDocument()
  })

  it('renders the month statistics section', () => {
    render(
      <MonthStatsPanel
        workedHoursPerDay={[8]}
        dates={['2024-01-15']}
        targetHoursPerDay={[8]}
        overtimeCarryOver={0}
        today="2024-01-15"
      />,
    )
    expect(screen.getByRole('region', { name: /month statistics/i })).toBeInTheDocument()
  })
})
