import type { AttentionDay } from './monthOverview'

interface Props {
  days: AttentionDay[]
  onSelectDate: (isoDate: string) => void
}

export function MonthAttentionStrip({ days, onSelectDate }: Props) {
  if (days.length === 0) return null

  return (
    <section
      aria-label="Days needing attention"
      className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20"
    >
      <p className="mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
        {days.length} day{days.length === 1 ? '' : 's'} need attention
      </p>
      <div className="flex flex-wrap gap-1.5">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className="rounded-full border bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-amber-900/40"
          >
            {day.weekdayShort} {day.dayOfMonth}
            <span className="ml-1.5 font-normal text-gray-500 dark:text-gray-400">{day.reason}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
