import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within, waitFor } from '@testing-library/react'
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
import type { MonthData } from '../../infra/repositories/types'
import { renderRoute } from '../../test/renderRoute'

/** July 2026 up to Fri the 3rd: Wed worked 9h, Thu tracked nothing, Fri worked 8h. */
const TRACKED_MONTH: Record<string, MonthData> = {
  '2026-07': {
    '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
    '2026-07-03': { windows: [{ id: 'b', start: '08:00', end: '16:00', category: '_OTHER', subtasks: [] }] },
  },
}

function makeWrapperWithRepos(monthData: Record<string, MonthData> = {}) {
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

function renderMonthView(monthData: Record<string, MonthData> = {}) {
  const repos = makeWrapperWithRepos(monthData)
  return renderRoute(MonthView, { path: '/month', search: { year: 2026, month: 7 }, wrapper: repos.Wrapper }).then(
    (result) => ({ ...result, ...repos }),
  )
}

describe('MonthView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 6, 3, 18, 0))
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('layout order', () => {
    it('Reset all button appears after the calendar', async () => {
      await renderMonthView()
      const firstDay = await screen.findByRole('button', { name: /Wednesday, 1 July 2026/i })
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(firstDay.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('month progress', () => {
    it('shows worked hours against the month target, and today alongside it', async () => {
      await renderMonthView(TRACKED_MONTH)

      await waitFor(() => expect(screen.getByRole('meter', { name: /worked/i })).toHaveAttribute('aria-valuenow', '17'))
      expect(within(screen.getByRole('status')).getByText('Today')).toBeInTheDocument()
    })

    it('puts each day hours and balance into its calendar cell', async () => {
      await renderMonthView(TRACKED_MONTH)

      const wednesday = await screen.findByRole('button', { name: /Wednesday, 1 July 2026/i })
      await waitFor(() => expect(wednesday.textContent).toContain('9.00h'))
      expect(wednesday.textContent).toContain('+1.00h')
    })

    it('offers the untracked past day for review', async () => {
      await renderMonthView(TRACKED_MONTH)

      expect(await screen.findByRole('button', { name: /Thu 2.*Nothing tracked/i })).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigates to the day view when a calendar day is selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const { router } = await renderMonthView(TRACKED_MONTH)

      await user.click(await screen.findByRole('button', { name: /Wednesday, 1 July 2026/i }))

      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
      expect(router.state.location.search).toEqual({ date: '2026-07-01' })
    })
  })

  describe('Reset all mutation', () => {
    it('moves the month to trash and clears it from the month repository', async () => {
      const user = userEvent.setup()
      const { monthRepo, trashRepo } = await renderMonthView({
        '2026-07': {
          '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
        },
      })

      await user.click(await screen.findByRole('button', { name: /reset all/i }))
      await user.click(screen.getByRole('button', { name: /reset month/i }))

      await waitFor(async () => {
        expect(await monthRepo.getMonth(2026, 7)).toEqual({})
      })
      expect(await trashRepo.list()).toHaveLength(1)
    })

    it('restores the month via Ctrl+Z', async () => {
      const user = userEvent.setup()
      const { monthRepo } = await renderMonthView({
        '2026-07': {
          '2026-07-01': { windows: [{ id: 'a', start: '08:00', end: '17:00', category: '_OTHER', subtasks: [] }] },
        },
      })

      await user.click(await screen.findByRole('button', { name: /reset all/i }))
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
    it('is semi-transparent at rest', async () => {
      await renderMonthView()
      const resetBtn = await screen.findByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/opacity-50/)
    })

    it('becomes fully visible on hover via class', async () => {
      await renderMonthView()
      const resetBtn = await screen.findByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/hover:opacity-100/)
    })
  })
})
