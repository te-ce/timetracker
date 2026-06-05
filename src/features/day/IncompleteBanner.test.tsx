import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IncompleteBanner } from './IncompleteBanner'

describe('IncompleteBanner', () => {
  it('is hidden when there are no incomplete days', () => {
    render(<IncompleteBanner incompleteDates={[]} onNavigate={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a banner with count when incomplete days exist', () => {
    render(<IncompleteBanner incompleteDates={['2024-01-15', '2024-01-16']} onNavigate={() => {}} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/2 days need attention/i)).toBeInTheDocument()
  })

  it('calls onNavigate with the correct date when a day button is clicked', async () => {
    const onNavigate = vi.fn()
    render(<IncompleteBanner incompleteDates={['2024-01-15']} onNavigate={onNavigate} />)
    const btn = screen.getByRole('button', { name: /15 January/i })
    await userEvent.click(btn)
    expect(onNavigate).toHaveBeenCalledWith('2024-01-15')
  })

  it('renders a button for each incomplete date', () => {
    render(<IncompleteBanner incompleteDates={['2024-01-15', '2024-01-16', '2024-01-17']} onNavigate={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })
})
