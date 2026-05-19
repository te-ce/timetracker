import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the timetracker heading', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Timetracker',
      }),
    ).toBeInTheDocument()
  })
})
