import { calculateOvertimeToDate } from '../../shared/overtime'
import { useTimeFormatStore } from '../../shared/timeFormatStore'
import { formatHours } from '../../shared/formatHours'
import { StatCard } from './StatCard'

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
