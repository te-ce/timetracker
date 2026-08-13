import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { LiveElapsed } from './LiveElapsed'

describe('LiveElapsed', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 25, 9, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the elapsed time since the given start', () => {
    render(<LiveElapsed since="08:00" timeFormat="hhmm" />)
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('ticks on its own without a prop or parent re-render', () => {
    render(<LiveElapsed since="08:00" timeFormat="hhmm" tickMs={1000} />)
    expect(screen.getByText('1:00')).toBeInTheDocument()

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 25, 9, 1, 0))
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('1:01')).toBeInTheDocument()
  })

  it('does not update before its own tick interval elapses', () => {
    render(<LiveElapsed since="08:00" timeFormat="hhmm" tickMs={1000} />)

    act(() => {
      vi.setSystemTime(new Date(2026, 4, 25, 9, 1, 0))
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByText('1:00')).toBeInTheDocument()
  })
})
