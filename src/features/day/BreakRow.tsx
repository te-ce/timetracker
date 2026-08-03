import { formatHours } from '../../shared/formatHours'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import type { DayBreak } from './dayBreaks'

interface BreakRowProps {
  dayBreak: DayBreak
  onFill: () => void
}

/** The time between two WorkPeriods — at the desk, but not working. */
export function BreakRow({ dayBreak, onFill }: BreakRowProps) {
  const timeFormat = useTimeFormatStore((s) => s.format)

  return (
    <li
      aria-label={`Break ${formatHours(dayBreak.hours, timeFormat)}, ${dayBreak.start} to ${dayBreak.end}`}
      className="flex items-center gap-3 py-2 text-xs text-amber-700 dark:text-amber-500"
    >
      <span className="w-4 shrink-0" />
      <span className="w-24 shrink-0 font-mono tabular-nums">
        {dayBreak.start}–{dayBreak.end}
      </span>
      <span className="w-14 shrink-0 text-right font-mono tabular-nums">{formatHours(dayBreak.hours, timeFormat)}</span>
      <span className="font-medium">break</span>
      <span className="h-px flex-1 border-t border-dashed border-amber-300 dark:border-amber-800/70" />
      <button
        type="button"
        onClick={onFill}
        className="font-medium text-indigo-600 underline decoration-dotted dark:text-indigo-400"
      >
        it was work — fill
      </button>
    </li>
  )
}
