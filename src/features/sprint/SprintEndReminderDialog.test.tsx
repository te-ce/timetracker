import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SprintEndReminderDialog } from './SprintEndReminderDialog'
import type { SprintBadgeState } from './sprintExportReminder'
import { requestSprintEndReminder, useSprintEndReminderStore } from '../../shared/sprintEndReminderStore'

let state: SprintBadgeState | undefined
vi.mock('./useSprintExportReminder', () => ({ useSprintExportReminder: () => state }))

const navigateSpy = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateSpy }))

const EXPORT_DUE: SprintBadgeState = { kind: 'export', sprints: [{ index: 2, start: '2026-09-17', end: '2026-10-07' }] }
const COUNTDOWN: SprintBadgeState = { kind: 'countdown', daysLeft: 5 }

describe('SprintEndReminderDialog', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
    useSprintEndReminderStore.setState({ requested: false })
  })

  it('stays hidden until a stop is requested', () => {
    state = EXPORT_DUE
    render(<SprintEndReminderDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows when a sprint needs export and navigates to export', async () => {
    state = EXPORT_DUE
    render(<SprintEndReminderDialog />)
    requestSprintEndReminder()
    expect(await screen.findByText('Export Sprint 3 before you log off.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Go to export' }))
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/sprint', search: { sprint: undefined } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks Electron to surface the window when the reminder is due', async () => {
    const show = vi.fn()
    vi.stubGlobal('electronAPI', { window: { show } })
    state = EXPORT_DUE
    render(<SprintEndReminderDialog />)
    requestSprintEndReminder()
    await screen.findByRole('dialog')
    expect(show).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('drops the request when no export is due', async () => {
    state = COUNTDOWN
    render(<SprintEndReminderDialog />)
    requestSprintEndReminder()
    await waitFor(() => expect(useSprintEndReminderStore.getState().requested).toBe(false))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the request while the state is still loading', async () => {
    state = undefined
    const { rerender } = render(<SprintEndReminderDialog />)
    requestSprintEndReminder()
    expect(useSprintEndReminderStore.getState().requested).toBe(true)
    state = EXPORT_DUE
    rerender(<SprintEndReminderDialog />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
