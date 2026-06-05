import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DayView } from './DayView'
import { RepositoryProvider } from '../repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'
import { InMemoryTimeTrackingRepository } from '../repositories/in-memory/time-tracking-repository'
import { InMemorySprintExportRepository } from '../repositories/in-memory/sprint-export-repository'
import type { DayQueryResult } from '../hooks/useDayQuery'
import type { OvertimeToDate } from '../domain/monthStats'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
  useSearch: () => ({ date: '2026-05-15' }),
}))

vi.mock('../hooks/useDayQuery', () => ({
  useDayQuery: vi.fn(),
}))

vi.mock('../components/WorkOverview', () => ({
  WorkOverview: () => null,
}))

vi.mock('../components/DayTypePicker', () => ({
  DayTypePicker: () => null,
}))

vi.mock('./DayNoteEditor', () => ({
  DayNoteEditor: () => createElement('div', { 'data-testid': 'day-note-editor' }),
}))

import { useDayQuery } from '../hooks/useDayQuery'

const navigateSpy = vi.fn()

function makeOvertimeToDate(): OvertimeToDate {
  return { value: 0, workedToday: 0, priorOvertime: 0 }
}

function stubQuery(overrides: Partial<DayQueryResult> = {}): void {
  vi.mocked(useDayQuery).mockReturnValue({
    config: DEFAULT_APP_CONFIG,
    windows: [],
    workLocation: null,
    autoCategoryOverride: null,
    dayTypeOverride: undefined,
    isConfirmed: false,
    dayNote: null,
    sollstunden: 8,
    defaultWorkLocation: 'Remote',
    effectiveLocation: 'Remote',
    autoCategory: null,
    workedHours: 0,
    manualTotal: 0,
    overtimeToDate: makeOvertimeToDate(),
    selectedDayType: 'WorkDay',
    isEntriesBalanced: false,
    hasAutoCategory: false,
    dayClassification: { displayStatus: 'untracked', reason: 'No work periods' },
    todayIso: '2026-06-03',
    officeDays: 0,
    totalWorkDays: 0,
    officePercent: 0,
    ...overrides,
  })
}

function makeWrapper(monthRepo: InMemoryMonthRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(),
    timeTrackingRepo: new InMemoryTimeTrackingRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
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
    it('shows office percentage and day count in OvertimeBar', () => {
      stubQuery({ officeDays: 3, totalWorkDays: 5, officePercent: 60 })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByText(/60%\s*office/i)).toBeInTheDocument()
      expect(screen.getByText(/3\/5\s*days/i)).toBeInTheDocument()
    })

    it('hides office stats when no work days tracked', () => {
      stubQuery({ officeDays: 0, totalWorkDays: 0, officePercent: 0 })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByText(/office/i)).not.toBeInTheDocument()
    })
  })

  describe('OvertimeBar placement', () => {
    it('renders OvertimeBar outside the work-periods section', () => {
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      const bar = screen.getByRole('status')
      const section = screen.getByRole('region', { name: /work periods/i })
      expect(section).not.toContainElement(bar)
    })

    it('always renders OvertimeBar even when workedToday is zero', () => {
      stubQuery({ overtimeToDate: { value: 0, workedToday: 0, priorOvertime: 0 } })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('shows the formatted date heading', () => {
      stubQuery()
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/15.*may.*2026/i)
    })

    it('shows Confirm button when day is not confirmed', () => {
      stubQuery({ isConfirmed: false })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /confirm day/i })).toBeInTheDocument()
    })

    it('shows ✓ Confirmed button when day is confirmed', () => {
      stubQuery({ isConfirmed: true })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /unconfirm day/i })).toBeInTheDocument()
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

  describe('mutations', () => {
    it('marks day as confirmed when Confirm is clicked', async () => {
      stubQuery({ isConfirmed: false })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      await userEvent.click(screen.getByRole('button', { name: /confirm day/i }))
      await waitFor(async () => {
        const data = await monthRepo.getMonth(2026, 5)
        expect(data[testDate]?.confirmed).toBe(true)
      })
    })

    it('unconfirms day when ✓ Confirmed is clicked', async () => {
      stubQuery({ isConfirmed: true })
      const repo = new InMemoryMonthRepository({
        '2026-05': {
          [testDate]: {
            windows: [{ id: 'a', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }],
            confirmed: true,
          },
        },
      })
      render(<DayView />, { wrapper: makeWrapper(repo) })
      await userEvent.click(screen.getByRole('button', { name: /unconfirm day/i }))
      await waitFor(async () => {
        const data = await repo.getMonth(2026, 5)
        expect(data[testDate]?.confirmed).toBe(false)
      })
    })
  })
})
