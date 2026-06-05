import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthView } from './MonthView'
import { RepositoryProvider } from '../repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'
import { InMemoryTimeTrackingRepository } from '../repositories/in-memory/time-tracking-repository'
import { InMemorySprintExportRepository } from '../repositories/in-memory/sprint-export-repository'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ year: 2026, month: 6 }),
}))

vi.mock('../hooks/useMonthSummaries', () => ({
  useMonthSummaries: vi.fn(),
}))

vi.mock('../components/MonthCalendar', () => ({
  MonthCalendar: () => createElement('div', { 'data-testid': 'month-calendar' }),
}))

vi.mock('../components/StatusLegend', () => ({
  StatusLegend: () => null,
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

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: new InMemoryMonthRepository({}),
    configRepo: new InMemoryConfigRepository(),
    timeTrackingRepo: new InMemoryTimeTrackingRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

describe('MonthView', () => {
  beforeEach(() => {
    stubSummaries()
  })

  describe('layout order', () => {
    it('Reset all button appears after OvertimeBar and before the calendar', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      const bar = screen.getByRole('status')
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      const calendar = screen.getByTestId('month-calendar')
      // OvertimeBar → Reset all → calendar
      expect(bar.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(resetBtn.compareDocumentPosition(calendar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })
})
