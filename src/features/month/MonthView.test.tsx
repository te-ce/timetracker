import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUndoStore } from '../../shared/undoStore'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthView } from './MonthView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { resolveAppConfig } from '../../shared/appConfigDefaults'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ year: 2026, month: 7 }),
}))

vi.mock('../../shared/useMonthView', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/useMonthView')>()),
  useMonthView: vi.fn(),
}))

import { buildMonthView, useMonthView } from '../../shared/useMonthView'
import type { MonthData } from '../../infra/repositories/types'

/** A month with no data — the base every stub in this file starts from. */
function emptyMonthView() {
  return {
    ...buildMonthView({
      year: 2026,
      month: 7,
      monthData: {},
      config: resolveAppConfig(undefined),
      todayIso: '2026-07-03',
      now: '12:00',
    }),
    isOvertimeReady: true,
  }
}

/** July 2026 up to Fri the 3rd: Wed worked 9h, Thu tracked nothing, Fri worked 8h. */
function stubTrackedMonth(): void {
  const monthData: MonthData = {
    '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
    '2026-07-03': { windows: [{ id: 'b', start: '08:00', end: '16:00', category: '_OTHER', subtasks: [] }] },
  }
  vi.mocked(useMonthView).mockReturnValue({
    ...buildMonthView({
      year: 2026,
      month: 7,
      monthData,
      config: resolveAppConfig(undefined),
      todayIso: '2026-07-03',
      now: '18:00',
    }),
    isOvertimeReady: true,
  })
}

type MonthSummariesReturn = ReturnType<typeof useMonthView>

function stubSummaries(): void {
  const stub: MonthSummariesReturn = emptyMonthView()
  vi.mocked(useMonthView).mockReturnValue(stub)
}

function makeWrapper(configRepo?: InMemoryConfigRepository) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository({})
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

function makeWrapperWithRepos(monthData: Record<string, MonthData>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository(monthData)
  const trashRepo = new InMemoryTrashRepository(monthRepo)
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo,
  }
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  return { Wrapper, monthRepo, trashRepo }
}

describe('MonthView', () => {
  beforeEach(() => {
    stubSummaries()
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
  })

  describe('layout order', () => {
    it('Reset all button appears after the calendar', () => {
      render(<MonthView />, { wrapper: makeWrapper() })
      const firstDay = screen.getByRole('button', { name: /Wednesday, 1 July 2026/i })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(firstDay.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('month progress', () => {
    it('shows worked hours against the month target, and today alongside it', () => {
      stubTrackedMonth()
      render(<MonthView />, { wrapper: makeWrapper() })

      expect(screen.getByRole('meter', { name: /worked/i })).toHaveAttribute('aria-valuenow', '17')
      expect(within(screen.getByRole('status')).getByText('Today')).toBeInTheDocument()
    })

    it('puts each day hours and balance into its calendar cell', () => {
      stubTrackedMonth()
      render(<MonthView />, { wrapper: makeWrapper() })

      const wednesday = screen.getByRole('button', { name: /Wednesday, 1 July 2026/i })
      expect(wednesday.textContent).toContain('9.00h')
      expect(wednesday.textContent).toContain('+1.00h')
    })

    it('offers the untracked past day for review', () => {
      stubTrackedMonth()
      render(<MonthView />, { wrapper: makeWrapper() })

      expect(screen.getByRole('button', { name: /Thu 2.*Nothing tracked/i })).toBeInTheDocument()
    })
  })

  describe('Reset all mutation', () => {
    it('moves the month to trash and clears it from the month repository', async () => {
      stubTrackedMonth()
      const { Wrapper, monthRepo, trashRepo } = makeWrapperWithRepos({
        '2026-07': {
          '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
        },
      })
      const user = userEvent.setup()
      render(<MonthView />, { wrapper: Wrapper })

      await user.click(screen.getByRole('button', { name: /reset all/i }))
      await user.click(screen.getByRole('button', { name: /reset month/i }))

      await waitFor(async () => {
        expect(await monthRepo.getMonth(2026, 7)).toEqual({})
      })
      expect(await trashRepo.list()).toHaveLength(1)
    })

    it('restores the month via Ctrl+Z', async () => {
      stubTrackedMonth()
      const { Wrapper, monthRepo } = makeWrapperWithRepos({
        '2026-07': {
          '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
        },
      })
      const user = userEvent.setup()
      render(<MonthView />, { wrapper: Wrapper })

      await user.click(screen.getByRole('button', { name: /reset all/i }))
      await user.click(screen.getByRole('button', { name: /reset month/i }))
      await waitFor(async () => {
        expect(await monthRepo.getMonth(2026, 7)).toEqual({})
      })

      await useUndoStore.getState().undo()

      await waitFor(async () => {
        const restored = await monthRepo.getMonth(2026, 7)
        expect(restored['2026-07-01']?.windows).toHaveLength(1)
      })
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
