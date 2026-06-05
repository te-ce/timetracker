import { render, screen } from '@testing-library/react'
import { OvertimeBar } from './OvertimeBar'

describe('OvertimeBar', () => {
  it('shows remaining hours when work is not done', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('remaining'))
  })

  it('shows Done when remaining is zero', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={8} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('Done'))
  })

  it('shows overtime when worked more than required', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={10} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('overtime today'))
  })

  it('shows undertime label when prior overtime is negative', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={-2} workedToday={0} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('undertime'))
  })

  it('includes "current" in aria-label when liveWindowStart is provided', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('current'))
  })

  it('does not include "current" in aria-label when liveWindowStart is absent', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label', expect.stringContaining('current'))
  })

  it('deducts live window elapsed from remaining', () => {
    // sollstunden=8, workedToday=3, liveWindow=1h → remaining=4h
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4'))
  })

  it('does not render office section when office props are omitted', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={0} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('shows office percentage and days when office props provided', () => {
    render(
      <OvertimeBar
        sollstunden={8}
        priorOvertime={0}
        workedToday={0}
        officeDays={3}
        totalWorkDays={5}
        officePercent={60}
      />,
    )
    expect(screen.getByText(/60%/)).toBeInTheDocument()
    expect(screen.getByText(/3\/5 days/)).toBeInTheDocument()
  })
})
