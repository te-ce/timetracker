import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SprintView } from './SprintView'
import { RepositoryProvider } from '../repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../repositories/in-memory/config-repository'
import { InMemoryTimeTrackingRepository } from '../repositories/in-memory/time-tracking-repository'
import { InMemorySprintExportRepository } from '../repositories/in-memory/sprint-export-repository'
import { DEFAULT_APP_CONFIG } from '../domain/appConfigDefaults'
import type { AppConfig } from '../repositories/types'

vi.mock('../auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

vi.mock('../components/SprintConfigPanel', () => ({
  SprintConfigPanel: () => createElement('div', { 'data-testid': 'sprint-config-panel' }),
}))

vi.mock('../services/workbookFactory', () => ({
  createWorkbookService: vi.fn(),
  isExportReady: vi.fn().mockReturnValue(false),
}))

function makeWrapper(config: AppConfig = DEFAULT_APP_CONFIG) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const repos = {
    monthRepo: new InMemoryMonthRepository(),
    configRepo: new InMemoryConfigRepository(config),
    timeTrackingRepo: new InMemoryTimeTrackingRepository(),
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
      expect(screen.queryByRole('button', { name: /prev/i })).not.toBeInTheDocument()
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
        const heading = screen.getByText(/sprint \d+/i).closest('h2')
        expect(heading?.textContent).toMatch(/\d{4}-\d{2}-\d{2}/)
      })
    })

    it('shows Prev and Next navigation buttons', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => {
        expect(screen.getByText(/← Prev/)).toBeInTheDocument()
        expect(screen.getByText(/Next →/)).toBeInTheDocument()
      })
    })

    it('Current button is disabled when viewing current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/← Prev/))
      const currentBtn = screen.getByText('Current')
      expect(currentBtn).toHaveClass('opacity-40')
    })

    it('navigates to previous sprint when Prev is clicked', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const initialSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByText(/← Prev/))

      await waitFor(() => {
        const newSprint = screen.getByText(/sprint \d+/i).textContent
        expect(newSprint).not.toBe(initialSprint)
      })
    })

    it('Current button becomes active after navigating away', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      await userEvent.click(screen.getByText(/← Prev/))
      await waitFor(() => {
        expect(screen.getByText('Current')).not.toHaveClass('opacity-40')
      })
    })

    it('Current button resets to current sprint', async () => {
      render(<SprintView />, { wrapper: makeWrapper(CONFIG_WITH_SPRINT) })
      await waitFor(() => screen.getByText(/sprint \d+/i))

      const originalSprint = screen.getByText(/sprint \d+/i).textContent
      await userEvent.click(screen.getByText(/← Prev/))
      await waitFor(() => {
        const changed = screen.getByText(/sprint \d+/i).textContent
        expect(changed).not.toBe(originalSprint)
      })

      await userEvent.click(screen.getByText('Current'))
      await waitFor(() => {
        expect(screen.getByText(/sprint \d+/i).textContent).toBe(originalSprint)
      })
    })
  })
})
