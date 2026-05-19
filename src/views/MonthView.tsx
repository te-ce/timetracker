import { useState } from 'react'
import { MonthCalendar } from '../components/MonthCalendar'
import { IncompleteBanner } from '../components/IncompleteBanner'
import { MonthStatsPanel } from '../components/MonthStatsPanel'

interface Props {
  onSelectDate: (date: string) => void
}

export function MonthView({ onSelectDate }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // TODO: compute from repository data
  const incompleteDates: string[] = []
  const workedHoursPerDay: number[] = []
  const workDayCount = 0
  const sollstunden = 8
  const overtimeCarryOver = 0

  return (
    <div className="flex flex-col gap-6">
      <MonthStatsPanel
        workedHoursPerDay={workedHoursPerDay}
        workDayCount={workDayCount}
        sollstunden={sollstunden}
        overtimeCarryOver={overtimeCarryOver}
      />
      <IncompleteBanner incompleteDates={incompleteDates} onNavigate={onSelectDate} />
      <MonthCalendar
        year={year}
        month={month}
        onSelectDate={onSelectDate}
        onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
      />
    </div>
  )
}
