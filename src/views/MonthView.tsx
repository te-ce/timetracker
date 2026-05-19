import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthStatsPanel } from '../components/MonthStatsPanel'
import { InMemoryWorkWindowRepository, InMemoryTimeEntryRepository, InMemoryConfigRepository } from '../repositories/in-memory'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeCarryOver } from '../domain/overtimeCarryOver'
import { classifyDay } from '../domain/dayType'
import { getDayStatus, type DayStatus } from '../domain/dayStatus'
import { toLocalIso } from '../domain/dateUtils'
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
  const todayIso = toLocalIso(today)

  // Compute worked hours per day and day status map
  const workedHoursPerDay: number[] = []
  const dayStatusMap: Record<string, DayStatus> = {}
  let workDayCount = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const iso = toLocalIso(date)
    const dayWindows = windows.filter((w) => w.date === iso)
    const worked = calculateWorkedHours(dayWindows)
    workedHoursPerDay.push(worked)

    const dayType = classifyDay(date)
    if (dayType === 'WorkDay') workDayCount++

    dayStatusMap[iso] = getDayStatus({
      dayType,
      hasWorkedHours: worked > 0,
      isoDate: iso,
      today: todayIso,
    })
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
      <MonthCalendar
        year={year}
        month={month}
        onSelectDate={onSelectDate}
        onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
        dayStatusMap={dayStatusMap}
      />
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Tracked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" /> Needs attention</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100 border border-blue-300" /> Today</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-300" /> Non-working</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white border border-gray-300" /> Future</span>
      </div>
    </div>
  )
}
