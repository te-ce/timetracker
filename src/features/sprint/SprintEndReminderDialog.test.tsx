import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { SprintEndReminderDialog } from './SprintEndReminderDialog'
import { requestSprintEndReminder, useSprintEndReminderStore } from '../../shared/sprintEndReminderStore'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import type { MonthData } from '../../infra/repositories/types'

// Sprints start 2026-01-05 (14 days). On 2026-06-30 sprint 12 (index 11, Jun 8 - Jun 21) has ended.
const CONFIG = { ...DEFAULT_APP_CONFIG, sprintStartDate: '2026-01-05', sprintLengthDays: 14 }
const EXPORT_DUE_DATA: Record<string, MonthData> = {
  '2026-06': {
    '2026-06-10': { windows: [{ id: 'w', start: '09:00', end: '12:00', category: '_COREMEDIA', subtasks: [] }] },
  },
}

function renderDialog(monthData: Record<string, MonthData>) {
  const monthRepo = new InMemoryMonthRepository(monthData)
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(CONFIG),
    sprintExportRepo: new InMemorySprintExportRepository(),
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute({
    component: () => (
      <>
        <SprintEndReminderDialog />
        <Outlet />
      </>
    ),
  })
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <p>Home page</p> })
  const sprintRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sprint',
    component: () => <p>Sprint page</p>,
    validateSearch: (search: Record<string, unknown>) => ({
      sprint: typeof search.sprint === 'number' ? search.sprint : undefined,
    }),
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, sprintRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  function Providers({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  }
  render(<RouterProvider router={router} />, { wrapper: Providers })
  return router
}

describe('SprintEndReminderDialog', () => {
  const show = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 30, 12, 0, 0))
    localStorage.clear()
    show.mockClear()
    vi.stubGlobal('electronAPI', { window: { show }, notify: { sprintExportDue: vi.fn() } })
    useSprintEndReminderStore.setState({ requested: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stays hidden until a stop is requested', async () => {
    renderDialog(EXPORT_DUE_DATA)
    await screen.findByText('Home page')
    await waitFor(() => expect(localStorage.length).toBeGreaterThan(0))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows when a sprint needs export and navigates to export', async () => {
    const router = renderDialog(EXPORT_DUE_DATA)
    await screen.findByText('Home page')
    requestSprintEndReminder()
    expect(await screen.findByText('Export Sprint 12 before you log off.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to export' }))
    expect(await screen.findByText('Sprint page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sprint')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks Electron to surface the window when the reminder is due', async () => {
    renderDialog(EXPORT_DUE_DATA)
    await screen.findByText('Home page')
    requestSprintEndReminder()
    await screen.findByRole('dialog')
    expect(show).toHaveBeenCalled()
  })

  it('drops the request when no export is due', async () => {
    renderDialog({})
    await screen.findByText('Home page')
    requestSprintEndReminder()
    await waitFor(() => expect(useSprintEndReminderStore.getState().requested).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the request while the reminder state is still loading', async () => {
    renderDialog(EXPORT_DUE_DATA)
    requestSprintEndReminder()
    expect(useSprintEndReminderStore.getState().requested).toBe(true)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('closes without navigating when cancelled', async () => {
    const router = renderDialog(EXPORT_DUE_DATA)
    await screen.findByText('Home page')
    requestSprintEndReminder()
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.pathname).toBe('/')
  })
})
