import { STATUS_BADGE, STATUS_LABEL } from '../../shared/statusColors'
import type { DayStatus } from '../../shared/dayStatus'
import { Tooltip } from '../../shared/Tooltip'

export interface DayActionsProps {
  badgeStatus: Exclude<DayStatus, 'today'>
  statusReason: string
}

export function DayActions({ badgeStatus, statusReason }: DayActionsProps) {
  if (badgeStatus === 'future') return null
  return (
    <Tooltip content={statusReason}>
      <span
        className={`inline-flex items-center cursor-help rounded-md border border-transparent px-3 py-1.5 text-sm font-medium ${STATUS_BADGE[badgeStatus].bg} ${STATUS_BADGE[badgeStatus].text}`}
      >
        {STATUS_LABEL[badgeStatus]}
      </span>
    </Tooltip>
  )
}
