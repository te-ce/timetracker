import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { useSprintEndReminderStore } from '../../shared/sprintEndReminderStore'
import { sprintExportBadgeLabel } from './sprintExportReminder'
import { useSprintExportReminder } from './useSprintExportReminder'

export function SprintEndReminderDialog() {
  const navigate = useNavigate()
  const requested = useSprintEndReminderStore((s) => s.requested)
  const state = useSprintExportReminder()
  const due = state?.kind === 'export'

  const close = () => useSprintEndReminderStore.setState({ requested: false })

  useEffect(() => {
    if (requested && state && !due) close()
    // A tray stop leaves the window hidden, so surface it for the dialog.
    if (requested && due) window.electronAPI?.window.show()
  }, [requested, state, due])

  if (!requested || state?.kind !== 'export') return null
  return (
    <ConfirmDialog
      title="Sprint export pending"
      message={`${sprintExportBadgeLabel(state.sprints)} before you log off.`}
      confirmLabel="Go to export"
      onConfirm={() => {
        close()
        void navigate({ to: '/sprint', search: { sprint: undefined } })
      }}
      onCancel={close}
    />
  )
}
