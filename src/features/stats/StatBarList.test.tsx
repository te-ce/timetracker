import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBarList } from './StatBarList'

describe('StatBarList', () => {
  it('renders a labelled row per entry with its value', () => {
    render(
      <StatBarList
        title="Hours by weekday"
        rows={[
          { key: 'mon', label: 'Monday', value: '8.00h', fillPercent: 100 },
          { key: 'tue', label: 'Tuesday', value: '4.00h', fillPercent: 50 },
        ]}
        emptyMessage="none"
      />,
    )
    expect(screen.getByRole('region', { name: /hours by weekday/i })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getByText('4.00h')).toBeInTheDocument()
  })

  it('shows the empty message instead of a list when there are no rows', () => {
    render(<StatBarList title="Hours by category" rows={[]} emptyMessage="No categorised hours yet." />)
    expect(screen.getByText('No categorised hours yet.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('clamps a bar fill that overshoots the range', () => {
    render(
      <StatBarList
        title="Hours by month"
        rows={[{ key: 'a', label: 'July 2026', value: '1.00h', fillPercent: 140 }]}
        emptyMessage="none"
      />,
    )
    const bar = screen.getByRole('listitem').querySelector('span > span')
    expect(bar).toHaveStyle({ width: '100%' })
  })
})
