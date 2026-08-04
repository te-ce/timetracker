import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { OvertimeBar } from './OvertimeBar'
import { deriveDayBalance, type DayBalance } from '../../shared/dayBalance'
import type { WorkPeriod } from '../../infra/repositories/types'

function period(start: string, end: string | null): WorkPeriod {
  return { id: `${start}-${end ?? 'open'}`, start, end, category: '_OTHER', subtasks: [] }
}

interface BalanceOptions {
  windows?: WorkPeriod[]
  sollstunden?: number
  priorOvertime?: number
  now?: string
  remainingTimeMode?: 'until-zero-overtime' | 'until-daily-target'
  remainingTimeReference?: 'planned-stop' | 'target-hours'
}

function balance(options: BalanceOptions = {}): DayBalance {
  return deriveDayBalance({
    windows: options.windows ?? [],
    sollstunden: options.sollstunden ?? 8,
    priorOvertime: options.priorOvertime ?? 0,
    now: options.now ?? '12:00',
    isToday: true,
    remainingTimeReference: options.remainingTimeReference ?? 'target-hours',
    remainingTimeMode: options.remainingTimeMode ?? 'until-zero-overtime',
  })
}

/** 3h closed, nothing running. */
const WORKED_3H = [period('09:00', '12:00')]
/** 3h closed + 1h still running at 13:00. */
const WORKED_3H_PLUS_LIVE = [period('09:00', '12:00'), period('12:00', null)]

describe('OvertimeBar', () => {
  it('shows remaining hours when work is not done', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('remaining'))
  })

  it('shows Done when remaining is zero', () => {
    render(<OvertimeBar balance={balance({ windows: [period('09:00', '17:00')], now: '17:00' })} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('Done'))
  })

  it('shows overtime when worked more than required', () => {
    render(<OvertimeBar balance={balance({ windows: [period('08:00', '18:00')], now: '18:00' })} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('overtime today'))
  })

  it('shows undertime label when prior overtime is negative', () => {
    render(<OvertimeBar balance={balance({ priorOvertime: -2 })} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('undertime'))
  })

  it('accounts for priorOvertime in remaining by default', () => {
    // sollstunden=8, priorOvertime=2, worked=3 → remaining = 8 - 2 - 3 = 3
    render(<OvertimeBar balance={balance({ windows: WORKED_3H, priorOvertime: 2 })} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('3.00h remaining'))
  })

  it('ignores priorOvertime when remainingTimeMode is until-daily-target', () => {
    // sollstunden=8, priorOvertime=2, worked=3 → remaining = 8 - 3 = 5 (ignore carry-over)
    render(
      <OvertimeBar
        balance={balance({ windows: WORKED_3H, priorOvertime: 2, remainingTimeMode: 'until-daily-target' })}
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('5.00h remaining'))
  })

  it('includes "current" in aria-label when a period is running', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('current'))
  })

  it('does not include "current" in aria-label when nothing is running', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label', expect.stringContaining('current'))
  })

  it('counts live elapsed once in remaining', () => {
    // 3h closed + 1h live = 4h worked → remaining = 8 − 4 = 4h (not 8 − 4 − 1 = 3h)
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4.00h remaining'))
  })

  it('does not double-count a period that is entirely live', () => {
    // Scenario: period re-opened (stop deleted). 5h live and nothing closed.
    render(<OvertimeBar balance={balance({ windows: [period('09:00', null)], now: '14:00' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h remaining'))
  })

  it('does not render office section when officeStats is omitted', () => {
    render(<OvertimeBar balance={balance()} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('shows office percentage and days when officeStats is provided', () => {
    render(<OvertimeBar balance={balance()} officeStats={{ officeDays: 3, totalWorkDays: 5, officePercent: 60 }} />)
    expect(screen.getByText(/60%/)).toBeInTheDocument()
    expect(screen.getByText(/3\/5 days/)).toBeInTheDocument()
  })

  describe('dismiss button', () => {
    it('shows hide button when onHide is provided', () => {
      render(<OvertimeBar balance={balance({ windows: WORKED_3H })} onHide={() => undefined} />)
      expect(screen.getByRole('button', { name: /hide overtime bar/i })).toBeInTheDocument()
    })

    it('calls onHide when hide button is clicked', async () => {
      const onHide = vi.fn()
      render(<OvertimeBar balance={balance({ windows: WORKED_3H })} onHide={onHide} />)
      await userEvent.click(screen.getByRole('button', { name: /hide overtime bar/i }))
      expect(onHide).toHaveBeenCalledOnce()
    })

    it('does not show hide button when onHide is not provided', () => {
      render(<OvertimeBar balance={balance({ windows: WORKED_3H })} />)
      expect(screen.queryByRole('button', { name: /hide overtime bar/i })).not.toBeInTheDocument()
    })
  })
})

describe('required today equation', () => {
  it('shows target minus overtime as required today in summary', () => {
    // 8h target − 2h overtime = 6h required
    render(<OvertimeBar balance={balance({ priorOvertime: 2 })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('6.00h required'))
  })

  it('shows target plus undertime as required today in summary', () => {
    // 8h target + 2h undertime = 10h required
    render(<OvertimeBar balance={balance({ priorOvertime: -2 })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('10.00h required'))
  })

  it('shows required today as sollstunden when in until-daily-target mode', () => {
    render(<OvertimeBar balance={balance({ priorOvertime: 2, remainingTimeMode: 'until-daily-target' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('8.00h required'))
  })

  it('renders a visible "required" label', () => {
    render(<OvertimeBar balance={balance({ priorOvertime: 2 })} />)
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })
})

describe('total worked today', () => {
  it('shows worked hours in summary when nothing is running', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h worked'))
  })

  it('includes live elapsed in the worked value', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4.00h worked'))
  })

  it('shows worked breakdown with past and current when live is active', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('3.00h past'))
  })

  it('renders a visible "past" label when live window is active', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} />)
    expect(screen.getByText(/past/i)).toBeInTheDocument()
  })
})

describe('Planned-Stop projection mode', () => {
  const plannedStop = [period('09:00', '17:00')]

  it('shows a projection indicator when a planned stop is set', () => {
    render(<OvertimeBar balance={balance({ windows: plannedStop })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('projected'))
  })

  it('does not show projection indicator when no planned stop exists', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} />)
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-label', expect.stringContaining('projected'))
  })

  it('shows the planned stop time in the aria-label', () => {
    render(<OvertimeBar balance={balance({ windows: plannedStop })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('17:00'))
  })

  it('renders a visible projection badge', () => {
    render(<OvertimeBar balance={balance({ windows: plannedStop })} />)
    expect(screen.getByText(/projected/i)).toBeInTheDocument()
  })

  it('uses projected hours instead of elapsed hours for remaining when countdown is off', () => {
    // 3h elapsed at 12:00, but the planned stop at 15:00 projects 6h → remaining = 8 − 6 = 2h
    render(<OvertimeBar balance={balance({ windows: [period('09:00', '15:00')] })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('2.00h remaining'))
  })

  it('uses the countdown to the planned stop as remaining in planned-stop mode', () => {
    // 17:00 − 12:00 = 5h countdown, which wins over the projected calculation
    render(<OvertimeBar balance={balance({ windows: plannedStop, remainingTimeReference: 'planned-stop' })} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('5.00h remaining'))
  })
})

describe('showTotalWorked mode', () => {
  it('shows total worked hours as the result when showTotalWorked is true', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} showTotalWorked />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('3.00h worked today'))
  })

  it('includes live elapsed in total worked when showTotalWorked is true', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H_PLUS_LIVE, now: '13:00' })} showTotalWorked />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('4.00h worked today'))
  })

  it('still shows remaining as the result when showTotalWorked is false', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} showTotalWorked={false} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', expect.stringContaining('remaining'))
  })
})

describe('isLoading', () => {
  it('skeletons the overtime-dependent numbers instead of showing a value seeded from an unresolved carry-over', () => {
    const { container } = render(<OvertimeBar balance={balance({ windows: WORKED_3H, priorOvertime: 2 })} isLoading />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-label', 'Loading overtime…')
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('still shows the worked-hours figure while overtime is loading', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} isLoading />)
    expect(screen.getByText(/3\.00h worked/)).toBeInTheDocument()
  })

  it('shows the real result instead of a skeleton when showTotalWorked is true, since worked hours do not depend on the carry-over', () => {
    render(<OvertimeBar balance={balance({ windows: WORKED_3H })} showTotalWorked isLoading />)
    expect(screen.getByText(/3\.00h worked today/)).toBeInTheDocument()
  })

  it('does not skeleton anything in until-daily-target mode, since neither required nor remaining depends on the carry-over there', () => {
    const { container } = render(
      <OvertimeBar
        balance={balance({ windows: WORKED_3H, priorOvertime: 2, remainingTimeMode: 'until-daily-target' })}
        isLoading
      />,
    )
    const status = screen.getByRole('status')
    expect(status).not.toHaveAttribute('aria-label', 'Loading overtime…')
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
  })

  it('shows real numbers when isLoading is false', () => {
    const { container } = render(<OvertimeBar balance={balance({ windows: WORKED_3H, priorOvertime: 2 })} />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
  })
})
