import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkOverview } from './WorkOverview'
import { InMemoryMonthRepository } from '../repositories/in-memory'
import type { WorkPeriod } from '../repositories/types'

vi.mock('./WorkPeriodPanel', () => ({
  WorkPeriodPanel: ({ date }: { date: string }) => <div data-testid="work-period-panel" data-date={date} />,
}))

function setup(overrides: Partial<React.ComponentProps<typeof WorkOverview>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <WorkOverview {...overrides} />
    </QueryClientProvider>,
  )
}

function period(id: string, start: string, end: string | null): WorkPeriod {
  return { id, start, end, category: 'Work', subtasks: [] }
}

const EMPTY_WINDOWS: WorkPeriod[] = []
const FULL_PROPS = {
  date: '2026-06-04',
  windows: EMPTY_WINDOWS,
  repository: new InMemoryMonthRepository({}),
  autoCategory: null,
}

describe('WorkOverview', () => {
  describe('stats bar', () => {
    it('renders stats bar with just overtime props (no date/windows/repository)', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 3 })
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('does not render stats bar when overtime props absent', () => {
      setup(FULL_PROPS)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('shows remaining hours in aria-label', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 3 })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('remaining'))
    })

    it('shows Done when worked equals target', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 8 })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('Done'))
    })

    it('shows overtime when worked exceeds target', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 10 })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('overtime today'))
    })

    it('shows undertime label when prior overtime is negative', () => {
      setup({ sollstunden: 8, priorOvertime: -2, workedToday: 0 })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('undertime'))
    })

    it('shows office stats when office props provided', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 0, officeDays: 3, totalWorkDays: 5, officePercent: 60 })
      expect(screen.getByText(/60%/)).toBeInTheDocument()
      expect(screen.getByText(/3\/5 days/)).toBeInTheDocument()
    })

    it('does not show office stats when office props absent', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 0 })
      expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    })

    it('includes "current" in aria-label for open period', () => {
      setup({
        sollstunden: 8,
        priorOvertime: 0,
        workedToday: 3,
        windows: [period('a', '09:00', null)],
        nowHHMM: '10:00',
      })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('current'))
    })

    it('deducts live window from remaining', () => {
      // workedToday=3, liveWindow=1h → remaining=4h
      setup({
        sollstunden: 8,
        priorOvertime: 0,
        workedToday: 3,
        windows: [period('a', '09:00', null)],
        nowHHMM: '10:00',
      })
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', expect.stringContaining('4'))
    })
  })

  describe('WorkPeriodPanel', () => {
    it('renders WorkPeriodPanel when date/windows/repository provided', () => {
      setup({ ...FULL_PROPS, sollstunden: 8, priorOvertime: 0, workedToday: 4 })
      expect(screen.getByTestId('work-period-panel')).toBeInTheDocument()
    })

    it('passes date to WorkPeriodPanel', () => {
      setup({ ...FULL_PROPS, date: '2026-01-15' })
      expect(screen.getByTestId('work-period-panel')).toHaveAttribute('data-date', '2026-01-15')
    })

    it('does not render WorkPeriodPanel when date/windows/repository absent', () => {
      setup({ sollstunden: 8, priorOvertime: 0, workedToday: 4 })
      expect(screen.queryByTestId('work-period-panel')).not.toBeInTheDocument()
    })

    it('renders stats bar above WorkPeriodPanel', () => {
      setup({ ...FULL_PROPS, sollstunden: 8, priorOvertime: 0, workedToday: 4 })
      const bar = screen.getByRole('status')
      const panel = screen.getByTestId('work-period-panel')
      expect(bar.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })
})
