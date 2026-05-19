import { useState } from 'react'
import { MonthCalendar } from '../components/MonthCalendar'
import { IncompleteBanner } from '../components/IncompleteBanner'

interface Props {
  onSelectDate: (date: string) => void
}

export function MonthView({ onSelectDate }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  // TODO: compute incompleteDates from repository data
  const incompleteDates: string[] = []

  return (
    <div className="flex flex-col gap-6">
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
