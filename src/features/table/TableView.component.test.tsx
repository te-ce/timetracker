import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deriveDayBalance, emptyDayBalance } from '../../shared/dayBalance'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TableView } from './TableView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { resolveAppConfig } from '../../shared/appConfigDefaults'
import type { WorkPeriod } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ expanded: false }),
}))

vi.mock('../../shared/useMonthView', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/useMonthView')>()),
  useMonthView: vi.fn(),
}))

vi.mock('./MonthTable', () => ({
  MonthGrid: ({
    onClearDay,
    expanded,
    openLogSignal,
  }: {
    onClearDay?: (date: string) => void
    expanded?: boolean
    openLogSignal?: number
  }) =>
    createElement(
      'div',
      {
        'data-testid': 'month-table',
        'data-expanded': String(expanded ?? false),
        'data-log-signal': String(openLogSignal ?? 0),
      },
      onClearDay
        ? createElement('button', { onClick: () => onClearDay('2026-06-05'), 'aria-label': 'trigger-clear-day' }, '×')
        : null,
    ),
}))

import { buildMonthView, useMonthView } from '../../shared/useMonthView'

/** A month with no data — the base every stub in this file starts from. */
function emptyMonthView() {
  return {
    ...buildMonthView({
      year: 2026,
      month: 6,
      monthData: {},
      config: resolveAppConfig(undefined),
      todayIso: '2026-06-05',
      now: '12:00',
    }),
    isOvertimeReady: true,
  }
}

type MonthSummariesReturn = ReturnType<typeof useMonthView>

function stubSummariesWithLiveWindow(liveWindowStart: string): void {
  const liveBalance = deriveDayBalance({
    windows: [{ id: 'live', start: liveWindowStart, end: null, category: '_OTHER', subtasks: [] }],
    sollstunden: 8,
    priorOvertime: 0,
    now: '12:00',
    remainingTimeReference: 'planned-stop',
    remainingTimeMode: 'until-zero-overtime',
  })
  const stub: MonthSummariesReturn = {
    ...emptyMonthView(),
    todayBalance: liveBalance,
  }
  vi.mocked(useMonthView).mockReturnValue(stub)
}

function stubSummaries(): void {
  const stub: MonthSummariesReturn = {
    ...emptyMonthView(),
    todayBalance: emptyDayBalance(8),
  }
  vi.mocked(useMonthView).mockReturnValue(stub)
}

function w(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end, category: '_COREMEDIA', subtasks: [] }
}

function makeWrapper(monthRepo?: InMemoryMonthRepository, configRepo?: InMemoryConfigRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: monthRepo ?? new InMemoryMonthRepository({}),
    configRepo: configRepo ?? new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

describe('TableView', () => {
  beforeEach(() => {
    stubSummaries()
  })

  describe('OvertimeBar live window', () => {
    it('reflects the elapsed time when today has an open window', () => {
      stubSummariesWithLiveWindow('09:00')
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByText('3.00h')).toBeInTheDocument()
    })

    it('shows nothing worked when no open window', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.queryByText('3.00h')).not.toBeInTheDocument()
      const bar = within(screen.getByRole('status'))
      expect(bar.getByText('Today').nextElementSibling).toHaveTextContent('0.00h')
    })
  })

  describe('layout order', () => {
    it('Reset all button appears after the grid', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      const grid = screen.getByTestId('month-table')
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(grid.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('Reset all button appearance', () => {
    it('is semi-transparent at rest', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/opacity-50/)
    })

    it('becomes fully visible on hover via class', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/hover:opacity-100/)
    })
  })

  describe('grid expand toggle', () => {
    it('renders an expand button', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByRole('button', { name: /expand table/i })).toBeInTheDocument()
    })

    it('grid starts collapsed (expanded=false)', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByTestId('month-table').dataset.expanded).toBe('false')
    })

    it('clicking expand passes expanded=true to grid', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /expand table/i }))
      expect(screen.getByTestId('month-table').dataset.expanded).toBe('true')
    })

    it('clicking expand again collapses grid', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /expand table/i }))
      await userEvent.click(screen.getByRole('button', { name: /collapse table/i }))
      expect(screen.getByTestId('month-table').dataset.expanded).toBe('false')
    })

    it('shows overlay container when expanded', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /expand table/i }))
      expect(screen.getByTestId('table-overlay')).toBeInTheDocument()
    })

    it('hides OvertimeBar when expanded', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByRole('status')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /expand table/i }))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('removes overlay when collapsed', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /expand table/i }))
      await userEvent.click(screen.getByRole('button', { name: /collapse table/i }))
      expect(screen.queryByTestId('table-overlay')).not.toBeInTheDocument()
    })
  })

  describe('clear day', () => {
    it('clicking X in grid shows confirm dialog', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      expect(screen.getByRole('heading', { name: /clear data for/i })).toBeInTheDocument()
    })

    it('confirming clear day resets that day windows', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-06': {
          '2026-06-05': { windows: [w('a', '09:00', '10:00')] },
        },
      })
      render(<TableView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      await userEvent.click(screen.getByRole('button', { name: /clear day/i }))
      await waitFor(async () => {
        const data = await monthRepo.getMonth(2026, 6)
        expect(data['2026-06-05']?.windows ?? []).toHaveLength(0)
      })
    })

    it('cancelling clear day leaves data intact', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-06': {
          '2026-06-05': { windows: [w('a', '09:00', '10:00')] },
        },
      })
      render(<TableView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      const data = await monthRepo.getMonth(2026, 6)
      expect(data['2026-06-05']?.windows).toHaveLength(1)
    })
  })

  describe('Log work button', () => {
    it('renders a Log work button', () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByRole('button', { name: /log work/i })).toBeInTheDocument()
    })

    it('increments openLogSignal passed to the grid when clicked', async () => {
      render(<TableView />, { wrapper: makeWrapper() })
      expect(screen.getByTestId('month-table').getAttribute('data-log-signal')).toBe('0')
      await userEvent.click(screen.getByRole('button', { name: /log work/i }))
      expect(screen.getByTestId('month-table').getAttribute('data-log-signal')).toBe('1')
    })
  })
})
