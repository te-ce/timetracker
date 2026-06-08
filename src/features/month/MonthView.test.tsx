import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthView } from './MonthView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemoryTimeTrackingRepository } from '../../infra/repositories/in-memory/time-tracking-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ year: 2026, month: 6 }),
}))

vi.mock('../../shared/useMonthSummaries', () => ({
  useMonthSummaries: vi.fn(),
}))

vi.mock('./MonthCalendar', () => ({
  MonthCalendar: () => createElement('div', { 'data-testid': 'month-calendar' }),
}))

vi.mock('./StatusLegend', () => ({
  StatusLegend: () => null,
}))

import { useMonthSummaries } from '../../shared/useMonthSummaries'

type MonthSummariesReturn = ReturnType<typeof useMonthSummaries>

function stubSummariesWithLiveWindow(liveWindowStart: string): void {
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
    targetHoursPerDay: [],
    todayIso: '2026-06-05',
    todayLiveWindowStart: liveWindowStart,
  }
  vi.mocked(useMonthSummaries).mockReturnValue(stub)
}

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
    targetHoursPerDay: [],
    todayIso: '2026-06-05',
    todayLiveWindowStart: undefined,
  }
  vi.mocked(useMonthSummaries).mockReturnValue(stub)
}

function makeWrapper(configRepo?: InMemoryConfigRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: new InMemoryMonthRepository({}),
    configRepo: configRepo ?? new InMemoryConfigRepository(),
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
    it('Reset all button appears after the calendar', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      const calendar = screen.getByTestId('month-calendar')
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(calendar.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('OvertimeBar live window', () => {
    it('shows current elapsed time when today has an open window', () => {
      stubSummariesWithLiveWindow('09:00')
      render(<MonthView />, { wrapper: makeWrapper() })
      expect(screen.getByText(/current/)).toBeInTheDocument()
    })

    it('does not show current elapsed time when no open window', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      expect(screen.queryByText(/current/)).not.toBeInTheDocument()
    })
  })

  describe('OvertimeBar visibility', () => {
    it('renders OvertimeBar by default', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('saves showOvertimeBar=false when hide button is clicked', async () => {
      const configRepo = new InMemoryConfigRepository()
      render(<MonthView />, { wrapper: makeWrapper(configRepo) })
      await userEvent.click(await screen.findByRole('button', { name: /hide overtime bar/i }))
      await waitFor(async () => {
        const saved = await configRepo.get()
        expect(saved.showOvertimeBar).toBe(false)
      })
    })

    it('hides OvertimeBar when showOvertimeBar is false in config', () => {
      vi.mocked(useMonthSummaries).mockReturnValue({
        config: { ...DEFAULT_APP_CONFIG, showOvertimeBar: false },
        summaries: { days: [], workDayCount: 0, workedHoursPerDay: [], hasAnyTrackedHours: false },
        dayTypeOverrides: new Map(),
        workLocations: new Map(),
        confirmedDays: new Set(),
        dayNotes: new Map(),
        overtimeToDate: { value: 0, workedToday: 0, priorOvertime: 0 },
        sollstunden: 8,
        targetHoursPerDay: [],
        todayIso: '2026-06-05',
        todayLiveWindowStart: undefined,
      })
      render(<MonthView />, { wrapper: makeWrapper() })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('Reset all button appearance', () => {
    it('is semi-transparent at rest', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/opacity-50/)
    })

    it('becomes fully visible on hover via class', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/hover:opacity-100/)
    })
  })
})
