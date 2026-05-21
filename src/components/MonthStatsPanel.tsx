import { calculateOvertimeToDate } from '../domain/monthStats'

interface Props {
  workedHoursPerDay: number[]
  dates: string[]
  sollstunden: number
  overtimeCarryOver: number
  today: string
}

export function MonthStatsPanel({ workedHoursPerDay, dates, sollstunden, overtimeCarryOver, today }: Props) {
  const toDate = calculateOvertimeToDate(workedHoursPerDay, dates, today, sollstunden)
  const cumulativeOvertime = overtimeCarryOver + toDate.value
  const hoursNeededToday = Math.max(0, sollstunden - toDate.workedToday)

  return (
    <section aria-label="Month statistics" className="grid grid-cols-2 gap-4">
      <StatCard
        label="Over/Undertime"
        value={`${cumulativeOvertime >= 0 ? '+' : ''}${cumulativeOvertime.toFixed(2)}h`}
        highlight={cumulativeOvertime !== 0}
        positive={cumulativeOvertime >= 0}
      />
      <StatCard
        label="Needed today"
        value={`${hoursNeededToday.toFixed(2)}h`}
        highlight={hoursNeededToday > 0}
      />
    </section>
  )
}

function StatCard({ label, value, highlight, positive }: { label: string; value: string; highlight?: boolean; positive?: boolean }) {
  const colorClass = highlight
    ? positive ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'
    : 'bg-white'
  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${colorClass}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
