import type { WorkPeriod } from '../../infra/repositories/types'

export interface PeriodTimeButtonProps {
  period: WorkPeriod
  running: boolean
  label: string
  onStartEditing: () => void
}

export function PeriodTimeButton({ period, running, label, onStartEditing }: PeriodTimeButtonProps) {
  return (
    <button
      type="button"
      onClick={onStartEditing}
      aria-label={`Edit times of ${label}`}
      className={`font-mono font-semibold tabular-nums hover:text-indigo-600 dark:hover:text-indigo-400 ${
        running ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'
      }`}
    >
      {period.start} → {period.end ?? 'now'}
    </button>
  )
}

/** Announces a WorkPeriod in the timeline: when it ran, how long, and what it was. */
