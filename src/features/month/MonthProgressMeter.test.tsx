import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MonthProgressMeter } from './MonthProgressMeter'
import { buildMonthOverview } from './monthOverview'
import type { DaySummary } from './daySummary'

function day(date: string, overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    dayType: 'WorkDay',
    workedHours: 8,
    entryTotal: 0,
    isEntriesBalanced: true,
    isConfirmed: false,
    dayStatus: 'complete',
    displayStatus: 'complete',
    statusReason: '',
    categoryBreakdown: {},
    ...overrides,
  }
}

function overview(days: DaySummary[], targetHoursPerDay: number[], today: string, cumulativeBalance = 0) {
  return buildMonthOverview({ days, targetHoursPerDay, today, cumulativeBalance })
}

describe('MonthProgressMeter', () => {
  it('reports worked hours against the full month target', () => {
    render(
      <MonthProgressMeter
        overview={overview([day('2026-07-01', { workedHours: 6 }), day('2026-07-02')], [8, 8], '2026-07-02')}
        showBalance
        officeStats={null}
        onHideBalance={vi.fn()}
      />,
    )

    const meter = screen.getByRole('meter', { name: /worked/i })
    expect(meter).toHaveAttribute('aria-valuenow', '14')
    expect(meter).toHaveAttribute('aria-valuemax', '16')
    expect(screen.getByText('14.00h')).toBeInTheDocument()
    expect(screen.getByText(/16\.00h/)).toBeInTheDocument()
  })

  it('marks how much of the month target is already due', () => {
    render(
      <MonthProgressMeter
        overview={overview(
          [day('2026-07-01'), day('2026-07-02'), day('2026-07-03'), day('2026-07-06')],
          [8, 8, 8, 8],
          '2026-07-02',
        )}
        showBalance
        officeStats={null}
        onHideBalance={vi.fn()}
      />,
    )

    expect(screen.getByTitle(/target up to today/i)).toHaveStyle({ left: '50%' })
  })

  it('shows the cumulative balance, and hides it when the user turned it off', async () => {
    const onHideBalance = vi.fn()
    const { unmount } = render(
      <MonthProgressMeter
        overview={overview([day('2026-07-01', { workedHours: 6 })], [8], '2026-07-01', -12.5)}
        showBalance
        officeStats={null}
        onHideBalance={onHideBalance}
      />,
    )

    expect(screen.getByText('−12.50h')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /hide balance/i }))
    expect(onHideBalance).toHaveBeenCalled()
    unmount()

    render(
      <MonthProgressMeter
        overview={overview([day('2026-07-01', { workedHours: 6 })], [8], '2026-07-01', -12.5)}
        showBalance={false}
        officeStats={null}
        onHideBalance={onHideBalance}
      />,
    )
    expect(screen.queryByText('−12.50h')).not.toBeInTheDocument()
  })

  it('counts what needs attention, and stays quiet when nothing does', () => {
    const withGaps = overview(
      [
        day('2026-07-01', { workedHours: 0, dayStatus: 'untracked', displayStatus: 'untracked' }),
        day('2026-07-02', { workedHours: 5, dayStatus: 'needs-review', displayStatus: 'needs-review' }),
      ],
      [8, 8],
      '2026-07-02',
    )
    const { unmount } = render(
      <MonthProgressMeter overview={withGaps} showBalance officeStats={null} onHideBalance={vi.fn()} />,
    )

    expect(screen.getByText(/1 day untracked/i)).toBeInTheDocument()
    expect(screen.getByText(/8\.00h missing/i)).toBeInTheDocument()
    expect(screen.getByText(/1 day to review/i)).toBeInTheDocument()
    unmount()

    render(
      <MonthProgressMeter
        overview={overview([day('2026-07-01')], [8], '2026-07-01')}
        showBalance
        officeStats={null}
        onHideBalance={vi.fn()}
      />,
    )
    expect(screen.queryByText(/untracked/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/to review/i)).not.toBeInTheDocument()
  })

  it('shows the office share only when office stats are enabled', () => {
    const monthOverview = overview([day('2026-07-01')], [8], '2026-07-01')
    const { unmount } = render(
      <MonthProgressMeter
        overview={monthOverview}
        showBalance
        officeStats={{ officeDays: 3, totalWorkDays: 10, officePercent: 30 }}
        onHideBalance={vi.fn()}
      />,
    )
    expect(screen.getByText(/30%/)).toBeInTheDocument()
    unmount()

    render(<MonthProgressMeter overview={monthOverview} showBalance officeStats={null} onHideBalance={vi.fn()} />)
    expect(screen.queryByText(/30%/)).not.toBeInTheDocument()
  })
})
