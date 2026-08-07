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
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { resolveAppConfig } from '../../shared/appConfigDefaults'
import { useUndoStore } from '../../shared/undoStore'
import type { WorkPeriod } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('../../shared/useMonthView', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/useMonthView')>()),
  useMonthView: vi.fn(),
}))

vi.mock('./MonthTable', () => ({
  MonthGrid: ({ onClearDay }: { onClearDay?: (date: string) => void }) =>
    createElement(
      'div',
      { 'data-testid': 'month-table' },
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
    isToday: true,
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
  const resolvedMonthRepo = monthRepo ?? new InMemoryMonthRepository({})
  const repos = {
    monthRepo: resolvedMonthRepo,
    configRepo: configRepo ?? new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(resolvedMonthRepo),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

function makeWrapperWithTrash(monthRepo: InMemoryMonthRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const trashRepo = new InMemoryTrashRepository(monthRepo)
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo,
  }
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  return { Wrapper, trashRepo }
}

describe('TableView', () => {
  beforeEach(() => {
    stubSummaries()
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
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

    it('moves the cleared day to trash and restores it via Ctrl+Z', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-06': {
          '2026-06-05': { windows: [w('a', '09:00', '10:00')] },
        },
      })
      const { Wrapper, trashRepo } = makeWrapperWithTrash(monthRepo)
      render(<TableView />, { wrapper: Wrapper })
      await userEvent.click(screen.getByRole('button', { name: /trigger-clear-day/i }))
      await userEvent.click(screen.getByRole('button', { name: /clear day/i }))

      await waitFor(async () => {
        const data = await monthRepo.getMonth(2026, 6)
        expect(data['2026-06-05']?.windows ?? []).toHaveLength(0)
      })
      expect(await trashRepo.list()).toHaveLength(1)

      await useUndoStore.getState().undo()

      await waitFor(async () => {
        const data = await monthRepo.getMonth(2026, 6)
        expect(data['2026-06-05']?.windows).toHaveLength(1)
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
})
