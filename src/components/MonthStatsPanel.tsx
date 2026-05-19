import { calculateMonthStats } from '../domain/monthStats'

interface Props {
  workedHoursPerDay: number[]
  workDayCount: number
  sollstunden: number
  overtimeCarryOver: number
}

export function MonthStatsPanel({ workedHoursPerDay, workDayCount, sollstunden, overtimeCarryOver }: Props) {
  const stats = calculateMonthStats(workedHoursPerDay, workDayCount, sollstunden)
  const cumulativeOvertime = overtimeCarryOver + stats.overtime

  return (
    <section aria-label="Month statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Total hours" value={`${stats.totalHours.toFixed(1)}h`} />
      <StatCard
        label="Overtime"
        value={`${stats.overtime >= 0 ? '+' : ''}${stats.overtime.toFixed(1)}h`}
        highlight={stats.overtime !== 0}
      />
      <StatCard label="Fulfillment" value={`${stats.fulfillmentPercent.toFixed(0)}%`} />
      <StatCard
        label="Carry-over"
        value={`${cumulativeOvertime >= 0 ? '+' : ''}${cumulativeOvertime.toFixed(1)}h`}
      />
    </section>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${highlight ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
