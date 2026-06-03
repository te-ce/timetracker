import { render, screen } from '@testing-library/react'
import { StatusLegend } from './StatusLegend'

describe('StatusLegend', () => {
  it('shows Future in the legend', () => {
    render(<StatusLegend />)
    expect(screen.getByText('Future')).toBeInTheDocument()
  })
})
