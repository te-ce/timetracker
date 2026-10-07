import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SprintEndReminderDialog } from './SprintEndReminderDialog'
import { RepositoryProvider } from '../../infra/repositories/RepositoryContext'
import { InMemoryMonthRepository } from '../../infra/repositories/in-memory/month-repository'
import { InMemoryConfigRepository } from '../../infra/repositories/in-memory/config-repository'
import { InMemorySprintExportRepository } from '../../infra/repositories/in-memory/sprint-export-repository'
import { InMemoryTrashRepository } from '../../infra/repositories/in-memory/trash-repository'
import { DEFAULT_APP_CONFIG } from '../../shared/appConfigDefaults'
import { requestSprintEndReminder, useSprintEndReminderStore } from '../../shared/sprintEndReminderStore'

vi.mock('../../infra/auth/msalInstance', () => ({
  getAccessToken: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  msalInstance: null,
}))

const navigateSpy = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }))

let today = '2026-01-18'
vi.mock('../../shared/dateUtils', () => ({ toLocalIso: () => today }))

const CONFIG = { sprintStartDate: '2026-01-05', sprintLengthDays: 14 }

function setup(exported = false) {
  const sprintExportRepo = new InMemorySprintExportRepository()
  if (exported) void sprintExportRepo.save({ sprintIndex: 0, status: 'exported', exportedAt: '2026-01-18' })
  const monthRepo = new InMemoryMonthRepository({})
  const repos = {
    monthRepo,
    configRepo: new InMemoryConfigRepository(DEFAULT_APP_CONFIG),
    sprintExportRepo,
    trashRepo: new InMemoryTrashRepository(monthRepo),
  }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(RepositoryProvider, { repos, children }))
  return render(<SprintEndReminderDialog config={CONFIG} />, { wrapper })
}

describe('SprintEndReminderDialog', () => {
  beforeEach(() => {
    today = '2026-01-18'
    navigateSpy.mockClear()
    useSprintEndReminderStore.setState({ requested: false })
  })

  it('stays hidden until a stop is requested', async () => {
    setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows on the last sprint day when not exported and navigates to export', async () => {
    setup()
    requestSprintEndReminder()
    await userEvent.click(await screen.findByRole('button', { name: 'Go to export' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/sprint', search: { sprint: undefined } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks Electron to surface the window when the reminder is due', async () => {
    const show = vi.fn()
    vi.stubGlobal('electronAPI', { window: { show } })
    setup()
    requestSprintEndReminder()
    await screen.findByRole('dialog')
    expect(show).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('stays hidden when the sprint is already exported', async () => {
    setup(true)
    requestSprintEndReminder()
    await waitFor(() => expect(useSprintEndReminderStore.getState().requested).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays hidden on a non-final day', async () => {
    today = '2026-01-17'
    setup()
    requestSprintEndReminder()
    await waitFor(() => expect(useSprintEndReminderStore.getState().requested).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
