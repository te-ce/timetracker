import { fireEvent, render, screen } from '@testing-library/react'
import { TimeNowField } from './TimeNowField'

describe('TimeNowField', () => {
  it('shows the live now value while untouched, and no reset button', () => {
    render(<TimeNowField now="09:00" value={null} onChange={() => {}} ariaLabel="Start time" />)
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00')
    expect(screen.queryByRole('button', { name: 'Reset to now' })).not.toBeInTheDocument()
  })

  it('shows a reset button once the value is overridden', () => {
    const onChange = vi.fn()
    render(<TimeNowField now="09:00" value="10:15" onChange={onChange} ariaLabel="Start time" />)
    expect(screen.getByLabelText('Start time')).toHaveValue('10:15')
    fireEvent.click(screen.getByRole('button', { name: 'Reset to now' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
