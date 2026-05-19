import { render, screen } from '@testing-library/react'
import { IncompleteBanner } from './IncompleteBanner'

describe('IncompleteBanner', () => {
  it('is hidden when there are no incomplete days', () => {
    render(<IncompleteBanner incompleteDates={[]} onNavigate={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a banner with count when incomplete days exist', () => {
    render(
      <IncompleteBanner
        incompleteDates={['2024-01-15', '2024-01-16']}
        onNavigate={() => {}}
      />,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/2 days need attention/i)).toBeInTheDocument()
  })
})
