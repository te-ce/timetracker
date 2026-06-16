import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
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

  it('accounts for priorOvertime in remaining by default', () => {
    // sollstunden=8, priorOvertime=2, workedToday=3 → remaining = 8 - 2 - 3 = 3
    render(<OvertimeBar sollstunden={8} priorOvertime={2} workedToday={3} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('3'))
  })

  it('ignores priorOvertime when remainingTimeMode is until-daily-target', () => {
    // sollstunden=8, priorOvertime=2, workedToday=3 → remaining = 8 - 3 = 5 (ignore carry-over)
    render(<OvertimeBar sollstunden={8} priorOvertime={2} workedToday={3} remainingTimeMode="until-daily-target" />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('5'))
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
    // workedToday now includes live elapsed (buildDaySummary passes `now`).
    // 3h closed + 1h live = 4h workedToday → remaining = 8 − 4 = 4h (not 8 − 4 − 1 = 3h).
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={4} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4'))
  })

  it('does not double-count live elapsed when workedToday already includes it', () => {
    // Scenario: period re-opened (stop deleted). workedToday=5h (5h live), liveWindow=5h.
    // remaining must be sollstunden − workedToday (not − workedToday − liveElapsed).
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={5} liveWindowStart="09:00" nowHHMM="14:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h remaining'))
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

  describe('dismiss button', () => {
    it('shows hide button when onHide is provided', () => {
      render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} onHide={() => undefined} />)
      expect(screen.getByRole('button', { name: /hide overtime bar/i })).toBeInTheDocument()
    })

    it('calls onHide when hide button is clicked', async () => {
      const onHide = vi.fn()
      render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} onHide={onHide} />)
      await userEvent.click(screen.getByRole('button', { name: /hide overtime bar/i }))
      expect(onHide).toHaveBeenCalledOnce()
    })

    it('does not show hide button when onHide is not provided', () => {
      render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} />)
      expect(screen.queryByRole('button', { name: /hide overtime bar/i })).not.toBeInTheDocument()
    })
  })
})

describe('required today equation', () => {
  it('shows target minus overtime as required today in summary', () => {
    // 8h target − 2h overtime = 6h required
    render(<OvertimeBar sollstunden={8} priorOvertime={2} workedToday={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('6.00h required'))
  })

  it('shows target plus undertime as required today in summary', () => {
    // 8h target + 2h undertime = 10h required
    render(<OvertimeBar sollstunden={8} priorOvertime={-2} workedToday={0} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('10.00h required'))
  })

  it('shows required today as sollstunden when in until-daily-target mode', () => {
    // carry-over is ignored, required = sollstunden
    render(<OvertimeBar sollstunden={8} priorOvertime={2} workedToday={0} remainingTimeMode="until-daily-target" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('8.00h required'))
  })

  it('renders a visible "required" label', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={2} workedToday={0} />)
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })
})

describe('total worked today', () => {
  it('shows totalWorked as worked value in summary when no live or tracking', () => {
    // totalWorked = workedToday = 3, shown as "3.00h worked"
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h worked'))
  })

  it('shows totalWorked including live elapsed as worked value', () => {
    // workedToday=4 (3h closed + 1h live), liveWindow=1h → totalWorked=4h shown as "4.00h worked"
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={4} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4.00h worked'))
  })

  it('shows worked breakdown with past and current when live is active', () => {
    // pastWorkedToday = workedToday − liveElapsed = 4 − 1 = 3h
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={4} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h past'))
  })

  it('renders a visible "past" label when live window is active', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={4} liveWindowStart="09:00" nowHHMM="10:00" />)
    expect(screen.getByText(/past/i)).toBeInTheDocument()
  })
})

describe('Planned-Stop projection mode', () => {
  it('shows a projection indicator when plannedStopTime is provided', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={8} plannedStopTime="17:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('projected'))
  })

  it('does not show projection indicator when plannedStopTime is absent', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={8} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label', expect.stringContaining('projected'))
  })

  it('shows the planned stop time in the aria-label', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={8} plannedStopTime="17:00" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('17:00'))
  })

  it('renders a visible projection badge', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={8} plannedStopTime="17:00" />)
    expect(screen.getByText(/projected/i)).toBeInTheDocument()
  })
})

describe('showTotalWorked mode', () => {
  it('shows total worked hours as the result when showTotalWorked is true', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} showTotalWorked />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('3.00h worked today'))
  })

  it('includes live elapsed in total worked when showTotalWorked is true', () => {
    // workedToday=4 (3h closed + 1h live), liveWindow=1h → totalWorked=4h
    render(
      <OvertimeBar
        sollstunden={8}
        priorOvertime={0}
        workedToday={4}
        liveWindowStart="09:00"
        nowHHMM="10:00"
        showTotalWorked
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('4.00h worked today'))
  })

  it('still shows remaining as the result when showTotalWorked is false', () => {
    render(<OvertimeBar sollstunden={8} priorOvertime={0} workedToday={3} showTotalWorked={false} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('remaining'))
  })
})
