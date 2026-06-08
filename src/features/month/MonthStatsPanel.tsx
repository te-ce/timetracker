import { calculateOvertimeToDate } from './monthStats'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'

interface Props {
  workedHoursPerDay: number[]
  dates: string[]
  targetHoursPerDay: number[]
  overtimeCarryOver: number
  today: string
}

export function MonthStatsPanel({ workedHoursPerDay, dates, targetHoursPerDay, overtimeCarryOver, today }: Props) {
  const toDate = calculateOvertimeToDate(workedHoursPerDay, dates, today, targetHoursPerDay)
  const cumulativeOvertime = overtimeCarryOver + toDate.value
  const todayIdx = dates.indexOf(today)
  const todaySollstunden = todayIdx >= 0 ? (targetHoursPerDay[todayIdx] ?? 0) : 0
  const hoursNeededToday = Math.max(0, todaySollstunden - toDate.workedToday)
  const timeFormat = useTimeFormatStore((s) => s.format)

  return (
    <section aria-label="Month statistics" className="grid grid-cols-2 gap-4">
      <StatCard
        label="Over/Undertime"
        value={`${cumulativeOvertime >= 0 ? '+' : ''}${formatHours(cumulativeOvertime, timeFormat)}`}
        highlight={cumulativeOvertime !== 0}
        positive={cumulativeOvertime >= 0}
      />
      <StatCard
        label="Needed today"
        value={formatHours(hoursNeededToday, timeFormat)}
        highlight={hoursNeededToday > 0}
      />
    </section>
  )
}

function StatCard({
  label,
  value,
  highlight,
  positive,
}: {
  label: string
  value: string
  highlight?: boolean
  positive?: boolean
}) {
  const colorClass = highlight
    ? positive
      ? 'border-green-300 bg-green-50 dark:bg-emerald-900/30 dark:border-green-700'
      : 'border-amber-300 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'
    : 'bg-white dark:bg-gray-800 dark:border-gray-700'
  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${colorClass}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
