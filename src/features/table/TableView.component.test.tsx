import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
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
import { useUndoStore } from '../../shared/undoStore'
import type { WorkPeriod } from '../../infra/repositories/types'
import { renderRoute } from '../../test/renderRoute'

function w(id: string, start: string, end: string): WorkPeriod {
  return { id, start, end, category: '_COREMEDIA', subtasks: [] }
}

function makeRepos(monthRepo: InMemoryMonthRepository = new InMemoryMonthRepository({})) {
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

async function renderTableView(monthRepo?: InMemoryMonthRepository) {
  const { Wrapper, trashRepo } = makeRepos(monthRepo)
  await renderRoute(TableView, { path: '/table', wrapper: Wrapper })
  return { trashRepo }
}

describe('TableView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 5, 12, 0))
    useUndoStore.setState({ past: [], future: [], canUndo: false, canRedo: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('OvertimeBar live window', () => {
    it('reflects the elapsed time when today has an open window', async () => {
      await renderTableView(
        new InMemoryMonthRepository({
          '2026-06': {
            '2026-06-05': {
              windows: [{ id: 'live', start: '09:00', end: null, category: '_OTHER', subtasks: [] }],
            },
          },
        }),
      )
      const bar = within(await screen.findByRole('status'))
      await waitFor(() => expect(bar.getByText('Today').nextElementSibling).toHaveTextContent('3.00h'))
    })

    it('shows nothing worked when no open window', async () => {
      await renderTableView()
      const bar = within(await screen.findByRole('status'))
      expect(bar.getByText('Today').nextElementSibling).toHaveTextContent('0.00h')
      expect(screen.queryByText('3.00h')).not.toBeInTheDocument()
    })
  })

  describe('layout order', () => {
    it('Reset all button appears after the grid', async () => {
      await renderTableView()
      const grid = await screen.findByRole('table')
      const resetBtn = screen.getByRole('button', { name: /reset all/i })
      expect(grid.compareDocumentPosition(resetBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  describe('Reset all button appearance', () => {
    it('is semi-transparent at rest', async () => {
      await renderTableView()
      const resetBtn = await screen.findByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/opacity-50/)
    })

    it('becomes fully visible on hover via class', async () => {
      await renderTableView()
      const resetBtn = await screen.findByRole('button', { name: /reset all/i })
      expect(resetBtn.className).toMatch(/hover:opacity-100/)
    })
  })

  describe('clear day', () => {
    it('clicking X in grid shows confirm dialog', async () => {
      await renderTableView()
      await userEvent.click(await screen.findByRole('button', { name: /^clear 2026-06-05$/i }))
      expect(screen.getByRole('heading', { name: /clear data for/i })).toBeInTheDocument()
    })

    it('confirming clear day resets that day windows', async () => {
      const monthRepo = new InMemoryMonthRepository({
        '2026-06': {
          '2026-06-05': { windows: [w('a', '09:00', '10:00')] },
        },
      })
      await renderTableView(monthRepo)
      await userEvent.click(await screen.findByRole('button', { name: /^clear 2026-06-05$/i }))
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
      const { trashRepo } = await renderTableView(monthRepo)
      await userEvent.click(await screen.findByRole('button', { name: /^clear 2026-06-05$/i }))
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
      await renderTableView(monthRepo)
      await userEvent.click(await screen.findByRole('button', { name: /^clear 2026-06-05$/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      const data = await monthRepo.getMonth(2026, 6)
      expect(data['2026-06-05']?.windows).toHaveLength(1)
    })
  })
})
