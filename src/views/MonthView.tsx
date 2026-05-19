import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { IncompleteBanner } from '../components/IncompleteBanner'
import { MonthStatsPanel } from '../components/MonthStatsPanel'
import { InMemoryWorkWindowRepository, InMemoryTimeEntryRepository, InMemoryConfigRepository } from '../repositories/in-memory'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeCarryOver } from '../domain/overtimeCarryOver'
import { isDayComplete } from '../domain/dayCompletion'
import { classifyDay } from '../domain/dayType'
import { useAppStore } from '../stores/appStore'

const workWindowRepo = new InMemoryWorkWindowRepository()
const timeEntryRepo = new InMemoryTimeEntryRepository()
const configRepo = new InMemoryConfigRepository()

export function MonthView() {
  const navigate = useNavigate()
  const setSelectedDate = useAppStore((s) => s.setSelectedDate)
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function onSelectDate(date: string) {
    setSelectedDate(date)
    void navigate({ to: '/day' })
  }

  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0)

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', year, month, 'month'],
    queryFn: () => workWindowRepo.findByDateRange(from, to),
  })

  useQuery({
    queryKey: ['timeEntries', year, month, 'month'],
    queryFn: () => timeEntryRepo.findByDateRange(from, to),
  })

  const sollstunden = config?.sollstunden ?? 8
  const daysInMonth = to.getDate()

  // Compute worked hours per day
  const workedHoursPerDay: number[] = []
  const incompleteDates: string[] = []
  let workDayCount = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const iso = date.toISOString().slice(0, 10)
    const dayWindows = windows.filter((w) => w.date === iso)
    const worked = calculateWorkedHours(dayWindows)
    workedHoursPerDay.push(worked)

    const dayType = classifyDay(date)
    if (dayType === 'WorkDay') workDayCount++

    const hasWindows = dayWindows.length > 0
    if (!isDayComplete(dayType, hasWindows) && date < today) {
      incompleteDates.push(iso)
    }
  }

  // Compute overtime carry-over for this month
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const overtimeCarryOver = calculateOvertimeCarryOver({
    initialOvertime: 0,
    monthlyOvertimes: [],
    manualOverrides: new Map(),
    targetMonth: monthKey,
  }).value

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
