import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MonthProgressMeter } from './MonthProgressMeter'
import { buildMonthOverview } from './monthOverview'
import { deriveDayBalance, emptyDayBalance } from '../../shared/dayBalance'
import type { DaySummary } from './daySummary'

function day(date: string, overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    date,
    dayType: 'WorkDay',
    workedHours: 8,
    entryTotal: 0,

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
        officeStats={null}
        todayBalance={emptyDayBalance(8)}
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
        officeStats={null}
        todayBalance={emptyDayBalance(8)}
      />,
    )

    expect(screen.getByTitle(/target up to today/i)).toHaveStyle({ left: '50%' })
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
      <MonthProgressMeter overview={withGaps} officeStats={null} todayBalance={emptyDayBalance(8)} />,
    )

    expect(screen.getByText(/1 day untracked/i)).toBeInTheDocument()
    expect(screen.getByText(/8\.00h missing/i)).toBeInTheDocument()
    expect(screen.getByText(/1 day to review/i)).toBeInTheDocument()
    unmount()

    render(
      <MonthProgressMeter
        overview={overview([day('2026-07-01')], [8], '2026-07-01')}
        officeStats={null}
        todayBalance={emptyDayBalance(8)}
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
        officeStats={{ officeDays: 3, totalWorkDays: 10, officePercent: 30 }}
        todayBalance={emptyDayBalance(8)}
      />,
    )
    expect(screen.getByText(/30%/)).toBeInTheDocument()
    unmount()

    render(<MonthProgressMeter overview={monthOverview} officeStats={null} todayBalance={emptyDayBalance(8)} />)
    expect(screen.queryByText(/30%/)).not.toBeInTheDocument()
  })

  describe("today's balance", () => {
    const monthOverview = overview([day('2026-07-01', { workedHours: 6 })], [8], '2026-07-01')

    it('shows how much of today is worked and remaining, and the overtime carried in', () => {
      const todayBalance = deriveDayBalance({
        windows: [{ id: 'a', start: '09:00', end: '12:00', category: '_OTHER', subtasks: [] }],
        sollstunden: 8,
        priorOvertime: -3.5,
        now: '12:00',
        isToday: true,
        remainingTimeReference: 'planned-stop',
        remainingTimeMode: 'until-zero-overtime',
      })

      render(<MonthProgressMeter overview={monthOverview} officeStats={null} todayBalance={todayBalance} />)

      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('3.00h')).toBeInTheDocument()
      expect(screen.getByText(/8\.50h remaining/i)).toBeInTheDocument()
      expect(screen.getByText('Overtime')).toBeInTheDocument()
      expect(screen.getByText('−3.50h')).toBeInTheDocument()
    })
  })
})
