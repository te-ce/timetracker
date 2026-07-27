import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DayView } from './DayView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import type { DayQueryResult } from './useDayQuery'
import type { OvertimeToDate } from '../month'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'

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
    dayClassification: { displayStatus: 'untracked', reason: 'No work periods' },
    todayIso: '2026-06-03',
    officeDays: 0,
    totalWorkDays: 0,
    officePercent: 0,
    isPlannedStopMode: false,
    plannedStopTime: null,
    countdownHours: 0,
    projectedWorkedToday: undefined,
    ...overrides,
  })
}

function makeWrapper(monthRepo: InMemoryMonthRepository, configRepo?: InMemoryConfigRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo,
    configRepo: configRepo ?? new InMemoryConfigRepository(),
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

    it('hides location toggle button when officeStats disabled in config', () => {
      stubQuery({ config: { ...DEFAULT_APP_CONFIG, officeStats: false }, effectiveLocation: 'Remote' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByRole('button', { name: /work location/i })).not.toBeInTheDocument()
    })

    it('shows location toggle button when officeStats enabled', () => {
      stubQuery({ config: { ...DEFAULT_APP_CONFIG, officeStats: true }, effectiveLocation: 'Remote' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /work location/i })).toBeInTheDocument()
    })
  })

  describe('OvertimeBar live tracking on past days', () => {
    it('does not show live tracking when viewing a past day with an open period', () => {
      stubQuery({
        windows: [{ id: 'a', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }],
        todayIso: '2026-06-03', // selectedDate '2026-05-15' is in the past
      })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      // LiveWindowBadge renders "{elapsed} current" — should not be present for a past day
      expect(screen.queryByText(/current/i)).not.toBeInTheDocument()
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

  describe('OvertimeBar visibility', () => {
    it('hides OvertimeBar when showOvertimeBar is false in config', () => {
      stubQuery({ config: { ...DEFAULT_APP_CONFIG, showOvertimeBar: false } })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('saves showOvertimeBar=false when hide button is clicked', async () => {
      const configRepo = new InMemoryConfigRepository()
      render(<DayView />, { wrapper: makeWrapper(monthRepo, configRepo) })
      await userEvent.click(await screen.findByRole('button', { name: /hide overtime bar/i }))
      await waitFor(async () => {
        const saved = await configRepo.get()
        expect(saved.showOvertimeBar).toBe(false)
      })
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

    it('keeps Confirm button visible on leave day', () => {
      stubQuery({ selectedDayType: 'Vacation', isConfirmed: false })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('button', { name: /confirm day/i })).toBeInTheDocument()
    })

    it('shows work periods section for WorkDay', () => {
      stubQuery({ selectedDayType: 'WorkDay' })
      render(<DayView />, { wrapper: makeWrapper(monthRepo) })
      expect(screen.getByRole('region', { name: /work periods/i })).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: /leave day info/i })).not.toBeInTheDocument()
    })
  })
})
