import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthGridView } from './MonthGridView'
import { RepositoryProvider } from '../repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'
import { InMemoryTimeTrackingRepository } from '../repositories/in-memory/time-tracking-repository'
import { InMemorySprintExportRepository } from '../repositories/in-memory/sprint-export-repository'
import type { WorkPeriod } from '../repositories/types'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/useMonthSummaries', () => ({
  useMonthSummaries: vi.fn(),
}))

vi.mock('../components/MonthGrid', () => ({
  MonthGrid: ({ onClearDay }: { onClearDay?: (date: string) => void }) =>
    createElement(
      'div',
      { 'data-testid': 'month-grid' },
      onClearDay
        ? createElement('button', { onClick: () => onClearDay('2026-06-05'), 'aria-label': 'trigger-clear-day' }, '×')
        : null,
    ),
}))

import { useMonthSummaries } from '../hooks/useMonthSummaries'

type MonthSummariesReturn = ReturnType<typeof useMonthSummaries>

function stubSummaries(): void {
  const stub: MonthSummariesReturn = {
    config: undefined,
    summaries: {
      days: [],
      workDayCount: 0,
      workedHoursPerDay: [],
      hasAnyTrackedHours: false,
    },
    dayTypeOverrides: new Map(),
    workLocations: new Map(),
    confirmedDays: new Set(),
    dayNotes: new Map(),
    overtimeToDate: { value: 0, workedToday: 0, priorOvertime: 0 },
    sollstunden: 8,
    todayIso: '2026-06-05',
  }
  vi.mocked(useMonthSummaries).mockReturnValue(stub)
}

function w(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end, category: '_COREMEDIA', subtasks: [] }
}

function makeWrapper(monthRepo?: InMemoryMonthRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: monthRepo ?? new InMemoryMonthRepository({}),
    configRepo: new InMemoryConfigRepository(),
    timeTrackingRepo: new InMemoryTimeTrackingRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

describe('MonthGridView', () => {
  beforeEach(() => {
    stubSummaries()
  })

  describe('layout order', () => {
    it('Reset all button appears after the grid', () => {
      render(<MonthGridView />, { wrapper: makeWrapper() })
      const grid = screen.getByTestId('month-grid')
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(grid.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('clear day', () => {
    it('clicking X in grid shows confirm dialog', async () => {
      render(<MonthGridView />, { wrapper: makeWrapper() })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      expect(screen.getByRole('heading', { name: /clear data for/i })).toBeInTheDocument()
    })

    it('confirming clear day resets that day windows', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-06': {
          '2026-06-05': { windows: [w('a', '09:00', '10:00')] },
        },
      })
      render(<MonthGridView />, { wrapper: makeWrapper(monthRepo) })
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
      render(<MonthGridView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      const data = await monthRepo.getMonth(2026, 6)
      expect(data['2026-06-05']?.windows).toHaveLength(1)
    })
  })
})
