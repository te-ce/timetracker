import type { WorkLocation } from '../../infra/repositories/types'

export function DayCellBadges({
  isTodayCell,
  note,
  location,
}: {
  isTodayCell: boolean
  note: string | undefined
  location: WorkLocation | undefined
}) {
  return (
    <span className="flex items-center gap-1 pt-0.5 text-[10px] leading-none" aria-hidden="true">
      {isTodayCell && (
        <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Today</span>
      )}
      {note && <span>✎</span>}
      {location === 'Office' && <span>⌂</span>}
    </span>
  )
}
