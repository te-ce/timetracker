import { LEAVE_TYPE_LABEL } from '../../shared/leaveTypeLabel'

// Vacation and sick leave share the purple 'leave' cell, so the chip's colour tells them apart.
const LEAVE_CHIP: Record<'Vacation' | 'SickDay', string> = {
  Vacation: 'bg-purple-200 text-purple-800 dark:bg-purple-800/50 dark:text-purple-200',
  SickDay: 'bg-rose-200 text-rose-800 dark:bg-rose-800/50 dark:text-rose-200',
}

export function LeaveChip({ type, half }: { type: 'Vacation' | 'SickDay'; half: boolean }) {
  return (
    <span className={`inline-block rounded px-1 py-0.5 text-[10px] font-medium leading-none ${LEAVE_CHIP[type]}`}>
      {half ? `½ ${LEAVE_TYPE_LABEL[type]}` : LEAVE_TYPE_LABEL[type]}
    </span>
  )
}
