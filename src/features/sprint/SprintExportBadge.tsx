import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '../../shared/Tooltip'
import { sprintExportBadgeLabel, sprintExportTooltipText, sprintCountdownLabel } from './sprintExportReminder'
import type { SprintBadgeState } from './sprintExportReminder'

interface Props {
  state: SprintBadgeState
}

export function SprintExportBadge({ state }: Props) {
  const navigate = useNavigate()

  if (state.kind === 'countdown') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
        {sprintCountdownLabel(state.daysLeft)}
      </span>
    )
  }

  const label = sprintExportBadgeLabel(state.sprints)
  const tooltip = sprintExportTooltipText(state.sprints)

  return (
    <Tooltip content={tooltip ?? label} placement="bottom">
      <button
        type="button"
        onClick={() => void navigate({ to: '/sprint', search: { sprint: undefined } })}
        className="flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
        aria-label={tooltip ? `${label}: ${tooltip}` : label}
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2v14M5 9l7 7 7-7" />
          <path d="M3 20h18" />
        </svg>
        {label}
      </button>
    </Tooltip>
  )
}
