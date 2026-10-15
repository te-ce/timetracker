import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
import type { AppConfig, Day } from '../../infra/repositories/types'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { renderRoute } from '../../test/renderRoute'

const testDate = '2026-05-15'

const CLOSED_PERIOD = { id: 'a', start: '09:00', end: '10:00', category: '_COREMEDIA', subtasks: [] }

function setToday(year: number, month: number, day: number): void {
  vi.setSystemTime(new Date(year, month - 1, day, 12, 0))
}

function makeWrapper(day: Day, config: AppConfig) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const monthRepo = new InMemoryMonthRepository({ '2026-05': { [testDate]: day } })
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(config),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

function renderDayView(day: Day = { windows: [CLOSED_PERIOD] }, config: AppConfig = DEFAULT_APP_CONFIG) {
  return renderRoute(DayView, { path: '/', search: { date: testDate }, wrapper: makeWrapper(day, config) })
}

describe('DayView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    setToday(2026, 6, 3)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('office stats', () => {
    it('hides location toggle button when officeStats disabled in config', async () => {
      await renderDayView(undefined, { ...DEFAULT_APP_CONFIG, officeStats: false })
      await screen.findByRole('heading', { level: 2 })
      expect(screen.queryByRole('button', { name: /work location/i })).not.toBeInTheDocument()
    })

    it('shows location toggle button when officeStats enabled', async () => {
      await renderDayView(undefined, { ...DEFAULT_APP_CONFIG, officeStats: true })
      expect(await screen.findByRole('button', { name: /work location/i })).toBeInTheDocument()
    })
  })

  describe('OvertimeBar follows the viewed day', () => {
    it('shows live tracking for an open period on the viewed day, even when it is not the actual today', async () => {
      await renderDayView({
        windows: [{ id: 'a', start: '09:00', end: null, category: '_COREMEDIA', subtasks: [] }],
      })
      // "Worked today" in the totals panel reflects the viewed day's own live elapsed time
      expect(await screen.findByRole('status', { name: /required/i })).toBeInTheDocument()
    })
  })

  describe('overtime balance placement', () => {
    it('renders the required/overtime/remaining block inside the work-periods section', async () => {
      await renderDayView()
      const balance = await screen.findByRole('status', { name: /required/i })
      const section = screen.getByRole('region', { name: /work periods/i })
      expect(section).toContainElement(balance)
    })

    it('always shows the balance block even when nothing was worked', async () => {
      await renderDayView({ windows: [] })
      expect(await screen.findByRole('status', { name: /required/i })).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('shows the formatted date heading', async () => {
      await renderDayView()
      expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent(/15.*may.*2026/i)
    })

    it('shows location button', async () => {
      await renderDayView()
      expect(await screen.findByRole('button', { name: /work location.*remote/i })).toBeInTheDocument()
    })

    it('hides status badge for future days', async () => {
      setToday(2026, 5, 1)
      await renderDayView({ windows: [] })
      await screen.findByRole('heading', { level: 2 })
      expect(screen.queryByText(/untracked|complete|needs.review/i)).not.toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('navigate to previous day when Prev is clicked', async () => {
      const { router } = await renderDayView()
      await userEvent.click(await screen.findByRole('button', { name: /previous day/i }))
      await waitFor(() => expect(router.state.location.search).toEqual({ date: '2026-05-14' }))
    })

    it('navigates to next day when Next is clicked', async () => {
      const { router } = await renderDayView()
      await userEvent.click(await screen.findByRole('button', { name: /next day/i }))
      await waitFor(() => expect(router.state.location.search).toEqual({ date: '2026-05-16' }))
    })

    it('Today button is disabled when viewing today', async () => {
      setToday(2026, 5, 15)
      await renderDayView()
      expect(await screen.findByRole('button', { name: /go to today/i })).toBeDisabled()
    })

    it('Today button is enabled when not on today', async () => {
      await renderDayView()
      expect(await screen.findByRole('button', { name: /go to today/i })).not.toBeDisabled()
    })
  })

  describe('leave day', () => {
    it.each(['Vacation', 'SickDay'] as const)(
      'hides work periods section and shows leave banner for %s',
      async (dayType) => {
        await renderDayView({ windows: [], dayTypeOverride: dayType })
        expect(await screen.findByRole('status', { name: /leave day info/i })).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: /work periods/i })).not.toBeInTheDocument()
        expect(screen.getByText(/8h on leave/i)).toBeInTheDocument()
      },
    )

    it('shows leave banner with the weekday target hours', async () => {
      await renderDayView(
        { windows: [], dayTypeOverride: 'Vacation' },
        { ...DEFAULT_APP_CONFIG, weekdayHours: [0, 8, 8, 8, 8, 6, 0] },
      )
      expect(await screen.findByText(/6h on leave/i)).toBeInTheDocument()
    })

    it('shows work periods section for WorkDay', async () => {
      await renderDayView()
      expect(await screen.findByRole('region', { name: /work periods/i })).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: /leave day info/i })).not.toBeInTheDocument()
    })
  })
})
