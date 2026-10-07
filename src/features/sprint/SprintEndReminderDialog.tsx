import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ConfirmDialog } from '../../shared/ConfirmDialog'
import { useSprintEndReminderStore } from '../../shared/sprintEndReminderStore'
import { toLocalIso } from '../../shared/dateUtils'
import { useSprintEndReminderDue } from './useSprintEndReminder'

interface Props {
  config: { sprintStartDate: string | null; sprintLengthDays: number } | undefined
}

export function SprintEndReminderDialog({ config }: Props) {
  const navigate = useNavigate()
  const requested = useSprintEndReminderStore((s) => s.requested)
  const due = useSprintEndReminderDue(config, toLocalIso(new Date()))

  const close = () => useSprintEndReminderStore.setState({ requested: false })

  useEffect(() => {
    if (requested && due === false) close()
  }, [requested, due])

  if (!requested || !due) return null
  return (
    <ConfirmDialog
      title="Last day of the sprint"
      message="Don't forget to export this sprint before you log off."
      confirmLabel="Go to export"
      onConfirm={() => {
        close()
        void navigate({ to: '/sprint', search: { sprint: undefined } })
      }}
      onCancel={close}
    />
  )
}
