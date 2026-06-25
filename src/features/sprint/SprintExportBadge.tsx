import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '../../shared'
import { sprintExportBadgeLabel, sprintExportTooltipText } from './sprintExportReminder'
import type { Sprint } from './sprint'

interface Props {
  sprints: Sprint[]
}

export function SprintExportBadge({ sprints }: Props) {
  const navigate = useNavigate()
  if (sprints.length === 0) return null

  const label = sprintExportBadgeLabel(sprints)
  const tooltip = sprintExportTooltipText(sprints)

  return (
    <Tooltip content={tooltip ?? label}>
      <button
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
