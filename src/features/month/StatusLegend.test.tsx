import { render, screen } from '@testing-library/react'
import { StatusLegend } from './StatusLegend'

describe('StatusLegend', () => {
  it('shows Future in the legend', () => {
    render(<StatusLegend />)
    expect(screen.getByText('Future')).toBeInTheDocument()
  })

  it('shows Confirmed in the legend', () => {
    render(<StatusLegend />)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('does not show Complete in the legend', () => {
    render(<StatusLegend />)
    expect(screen.queryByText('Complete')).not.toBeInTheDocument()
  })

  it('shows all expected statuses', () => {
    render(<StatusLegend />)
    for (const label of ['Confirmed', 'Needs review', 'Untracked', 'Future', 'Leave', 'Non-working']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
