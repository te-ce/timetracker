import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SprintView } from './SprintView'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { AppConfig, MonthData } from '../../infra/repositories/types'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('./SprintConfigPanel', () => ({
  SprintConfigPanel: () => createElement('div', { 'data-testid': 'sprint-config-panel' }),
}))

vi.mock('../excel/workbookFactory', () => ({
  createWorkbookService: vi.fn(),
  isExportReady: vi.fn().mockReturnValue(false),
}))

// Pin "today" to 2026-01-10 so Sprint 1 (Jan 5–18) is always the current sprint in data tests
vi.mock('../../shared/dateUtils', () => ({
  toLocalIso: vi.fn().mockReturnValue('2026-01-10'),
}))

function makeWrapper(config: AppConfig = DEFAULT_APP_CONFIG, monthData: Record<string, MonthData> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: new InMemoryMonthRepository(monthData),
    configRepo: new InMemoryConfigRepository(config),
    sprintExportRepo: new InMemorySprintExportRepository(),
  }
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
}

const CONFIG_WITH_SPRINT: AppConfig = {
  ...DEFAULT_APP_CONFIG,
  sprintStartDate: '2026-01-05',
  sprintLengthDays: 14,
}

describe('SprintView', () => {
  describe('when no sprint is configured', () => {
    it('renders the config panel', async () => {
      render(<SprintView />, { wrapper: makeWrapper() })
      await waitFor(() => {
        expect(screen.getByTestId('sprint-config-panel')).toBeInTheDocument()
      })
    })

    it('does not render sprint navigation', async () => {
      render(<SprintView />, { wrapper: makeWrapper() })
      await waitFor(() => expect(screen.getByTestId('sprint-config-panel')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: /previous sprint/i })).not.toBeInTheDocument()
    })
  })

  describe('when sprint is configured', () => {
    it('shows sprint heading with sprint number', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(screen.getByText(/sprint \d+/i)).toBeInTheDocument()
      })
    })

    it('shows sprint date range in heading', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(
          screen.getByText(new RegExp(`${CONFIG_WITH_SPRINT.sprintStartDate}.*\\d{4}-\\d{2}-\\d{2}`)),
        ).toBeInTheDocument()
      })
    })

    it('shows Prev and Next navigation buttons', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /previous sprint/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next sprint/i })).toBeInTheDocument()
      })
    })

    it('Current button is disabled when viewing current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByRole('button', { name: /previous sprint/i }))
      const currentBtn = screen.getByRole('button', { name: /^current$/i })
      expect(currentBtn).toHaveClass('opacity-40')
    })

    it('navigates to previous sprint when Prev is clicked', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const initialSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))

      await waitFor(() => {
        const newSprint = screen.getByText(/sprint \d+/i).textContent
        expect(newSprint).not.toBe(initialSprint)
      })
    })

    it('Current button becomes active after navigating away', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^current$/i })).not.toHaveClass('opacity-40')
      })
    })

    it('Current button resets to current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const originalSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByRole('button', { name: /previous sprint/i }))
      await waitFor(() => {
        const changed = screen.getByText(/sprint \d+/i).textContent
        expect(changed).not.toBe(originalSprint)
      })

      await userEvent.click(screen.getByRole('button', { name: /^current$/i }))
      await waitFor(() => {
        expect(screen.getByText(/sprint \d+/i).textContent).toBe(originalSprint)
      })
    })
  })

  describe('sprint report data', () => {
    // toLocalIso is mocked to return '2026-01-10', so Sprint 1 (Jan 5–18) is always current
    const CONFIG: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      sprintStartDate: '2026-01-05',
      sprintLengthDays: 14,
      customCategories: [],
    }
    const MONTH_DATA: Record<string, MonthData> = {
      '2026-01': {
        '2026-01-06': {
          windows: [{ id: 'w1', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] }],
        },
        '2026-01-07': {
          windows: [{ id: 'w2', start: '08:00', end: '10:00', category: '_SUPPORT', subtasks: [] }],
        },
      },
    }

    it('shows category hours from entries within the sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, MONTH_DATA) })
      await waitFor(() => expect(screen.getByText('3.00h')).toBeInTheDocument())
      expect(screen.getByText('2.00h')).toBeInTheDocument()
    })

    it('shows correct sprint total', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, MONTH_DATA) })
      await waitFor(() => {
        const totalRow = screen.getByText('Total').closest('tr')
        expect(totalRow?.textContent).toMatch(/5:00/)
        expect(totalRow?.textContent).toMatch(/5\.00h/)
      })
    })

    it('excludes entries outside the sprint date range', async () => {
      const withOutlier: Record<string, MonthData> = {
        '2026-01': {
          ...MONTH_DATA['2026-01'],
          // Jan 19 is outside Sprint 1 (Jan 5–18)
          '2026-01-19': {
            windows: [{ id: 'w-out', start: '09:00', end: '17:00', category: '_LEAVE', subtasks: [] }],
          },
        },
      }
      render(<SprintView />, { wrapper: makeWrapper(CONFIG, withOutlier) })
      await waitFor(() => {
        const totalRow = screen.getByText('Total').closest('tr')
        expect(totalRow?.textContent).toMatch(/5:00/)
        expect(totalRow?.textContent).toMatch(/5\.00h/)
      })
    })

    it('shows 0:00 / 0.00h total when sprint has no entries', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG) })
      await waitFor(() => expect(screen.getByText('Total')).toBeInTheDocument())
      const totalRow = screen.getByText('Total').closest('tr')
      expect(totalRow?.textContent).toMatch(/0:00/)
      expect(totalRow?.textContent).toMatch(/0\.00h/)
    })
  })
})
