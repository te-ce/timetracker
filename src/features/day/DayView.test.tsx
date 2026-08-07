import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DayView } from './DayView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import type { DayQueryResult } from './useDayQuery'
import type { OvertimeToDate } from '../month'
import { DEFAULT_APP_CONFIG, resolveAppConfig } from '../../shared/appConfigDefaults'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
  useSearch: () => ({ date: '2026-05-15' }),
}))

vi.mock('./useDayQuery', () => ({
  useDayQuery: vi.fn(),
}))

vi.mock('./WorkOverview', () => ({
  WorkOverview: () => null,
}))

vi.mock('./DayTypePicker', () => ({
  DayTypePicker: () => null,
}))

vi.mock('./DayNoteEditor', () => ({
  DayNoteEditor: () => createElement('div', { 'data-testid': 'day-note-editor' }),
}))

import { useDayQuery } from './useDayQuery'

const navigateSpy = vi.fn()

function makeOvertimeToDate(): OvertimeToDate {
  return { value: 0, workedToday: 0, priorOvertime: 0 }
}

function stubQuery(overrides: Partial<DayQueryResult> = {}): void {
  vi.mocked(useDayQuery).mockReturnValue({
    config: resolveAppConfig(DEFAULT_APP_CONFIG),
    windows: [],
    workLocation: null,
    autoCategoryOverride: null,
    dayTypeOverride: undefined,
    halfDayLeave: undefined,
    dayNote: null,
    sollstunden: 8,
    defaultWorkLocation: 'Remote',
    effectiveLocation: 'Remote',
    autoCategory: null,
    workedHours: 0,
    manualTotal: 0,
    overtimeToDate: makeOvertimeToDate(),
    selectedDayType: 'WorkDay',
    dayClassification: { displayStatus: 'untracked', reason: 'No work periods' },
    todayIso: '2026-06-03',
    officeDays: 0,
    totalWorkDays: 0,
    officePercent: 0,
    isOvertimeReady: true,
    ...overrides,
  })
}

function makeWrapper(monthRepo: InMemoryMonthRepository, configRepo?: InMemoryConfigRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo,
    configRepo: configRepo ?? new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

const testDate = '2026-05-15'

describe('DayView', () => {
  let monthRepo: InMemoryMonthRepository

  beforeEach(() => {
    navigateSpy.mockReset()
    monthRepo = new InMemoryMonthRepository({
      '2026-05': {
        [testDate]: { windows: [{ id: 'a', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }] },
      },
    })
    stubQuery()
  })

  describe('office stats', () => {
    it('hides location toggle button when officeStats disabled in config', () => {
      stubQuery({
        config: resolveAppConfig({ ...DEFAULT_APP_CONFIG, officeStats: false }),
        effectiveLocation: 'Remote',
      })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByRole('button', { name: /work location/i })).not.toBeInTheDocument()
    })

    it('shows location toggle button when officeStats enabled', () => {
      stubQuery({ config: resolveAppConfig({ ...DEFAULT_APP_CONFIG, officeStats: true }), effectiveLocation: 'Remote' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /work location/i })).toBeInTheDocument()
    })
  })

  describe('OvertimeBar follows the viewed day', () => {
    it('shows live tracking for an open period on the viewed day, even when it is not the actual today', () => {
      stubQuery({
        windows: [{ id: 'a', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }],
        todayIso: '2026-06-03', // selectedDate '2026-05-15' is in the past
      })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      // "Worked today" in the totals panel reflects the viewed day's own live elapsed time
      expect(screen.getByRole('status', { name: /required/i })).toBeInTheDocument()
    })
  })

  describe('overtime balance placement', () => {
    it('renders the required/overtime/remaining block inside the work-periods section', () => {
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      const balance = screen.getByRole('status', { name: /required/i })
      const section = screen.getByRole('region', { name: /work periods/i })
      expect(section).toContainElement(balance)
    })

    it('always shows the balance block even when workedToday is zero', () => {
      stubQuery({ overtimeToDate: { value: 0, workedToday: 0, priorOvertime: 0 } })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('status', { name: /required/i })).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('shows the formatted date heading', () => {
      stubQuery()
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/15.*may.*2026/i)
    })

    it('shows location button', () => {
      stubQuery({ effectiveLocation: 'Remote' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /work location.*remote/i })).toBeInTheDocument()
    })

    it('hides status badge for future days', () => {
      stubQuery({ dayClassification: { displayStatus: 'future', reason: '' } })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByText(/untracked|complete|needs.review/i)).not.toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigate to previous day when Prev is clicked', async () => {
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /previous day/i }))
      expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ search: { date: '2026-05-14' } }))
    })

    it('navigates to next day when Next is clicked', async () => {
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /next day/i }))
      expect(navigateSpy).toHaveBeenCalledWith(expect.objectContaining({ search: { date: '2026-05-16' } }))
    })

    it('Today button is disabled when viewing today', () => {
      stubQuery({ todayIso: testDate })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /go to today/i })).toBeDisabled()
    })

    it('Today button is enabled when not on today', () => {
      stubQuery({ todayIso: '2026-06-03' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /go to today/i })).not.toBeDisabled()
    })
  })

  describe('leave day', () => {
    it.each(['Vacation', 'SickDay'] as const)('hides work periods section and shows leave banner for %s', (dayType) => {
      stubQuery({ selectedDayType: dayType, sollstunden: 8 })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByRole('region', { name: /work periods/i })).not.toBeInTheDocument()
      expect(screen.getByRole('status', { name: /leave day info/i })).toBeInTheDocument()
      expect(screen.getByText(/8h on leave/i)).toBeInTheDocument()
    })

    it('shows leave banner with configured sollstunden hours', () => {
      stubQuery({ selectedDayType: 'Vacation', sollstunden: 6 })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByText(/6h on leave/i)).toBeInTheDocument()
    })

    it('shows work periods section for WorkDay', () => {
      stubQuery({ selectedDayType: 'WorkDay' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('region', { name: /work periods/i })).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: /leave day info/i })).not.toBeInTheDocument()
    })
  })
})
