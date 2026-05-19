import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the app shell with navigation', () => {
    render(<App />)
    expect(screen.getByText('Timetracker')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
