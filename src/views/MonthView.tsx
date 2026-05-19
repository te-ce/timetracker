import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthStatsPanel } from '../components/MonthStatsPanel'
import { workWindowRepo, timeEntryRepo, configRepo, dayTypeOverrideRepo } from '../repositories/shared'
import { calculateWorkedHours } from '../domain/worktime'
import { calculateOvertimeCarryOver } from '../domain/overtimeCarryOver'
import { classifyDay } from '../domain/dayType'
import type { DayType } from '../domain/dayType'
import { getDayStatus, type DayStatus } from '../domain/dayStatus'
import { toLocalIso } from '../domain/dateUtils'

export function MonthView() {
  const navigate = useNavigate()
  const { year, month } = useSearch({ from: '/' })
  const today = new Date()
  // month in search params is 1-indexed, internally we use 0-indexed for Date constructor
  const monthIdx = month - 1

  function onSelectDate(date: string) {
    void navigate({ to: '/day', search: { date } })
  }

  function onMonthChange(y: number, m: number) {
    void navigate({ to: '/', search: { year: y, month: m + 1 } })
  }

  const from = new Date(year, monthIdx, 1)
  const to = new Date(year, monthIdx + 1, 0)

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => configRepo.get(),
  })

  const { data: windows = [] } = useQuery({
    queryKey: ['workWindows', year, month, 'month'],
    queryFn: () => workWindowRepo.findByDateRange(from, to),
  })

  const fromIso = toLocalIso(from)
  const toIso = toLocalIso(to)

  const { data: dayTypeOverrides = new Map() } = useQuery({
    queryKey: ['dayTypeOverrides', year, month],
    queryFn: () => dayTypeOverrideRepo.findByDateRange(fromIso, toIso),
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', year, month, 'month'],
    queryFn: () => timeEntryRepo.findByDateRange(from, to),
  })

  const sollstunden = config?.sollstunden ?? 8
  const daysInMonth = to.getDate()
  const todayIso = toLocalIso(today)

  // Compute worked hours and entry totals per day
  const workedHoursPerDay: number[] = []
  const entryTotalsPerDay: number[] = []
  let workDayCount = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIdx, day)
    const iso = toLocalIso(date)
    const dayWindows = windows.filter((w) => w.date === iso)
    const worked = calculateWorkedHours(dayWindows)
    workedHoursPerDay.push(worked)

    const dayEntries = entries.filter((e) => e.date === iso)
    const entryTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0)
    entryTotalsPerDay.push(entryTotal)

    const override = dayTypeOverrides.get(iso)
    const dayType: DayType = override ?? classifyDay(date)
    if (dayType === 'WorkDay') workDayCount++
  }

  const hasAnyTrackedHours = workedHoursPerDay.some((h) => h > 0)

  // Build day status map
  const dayStatusMap: Record<string, DayStatus> = {}
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIdx, day)
    const iso = toLocalIso(date)
    const override = dayTypeOverrides.get(iso)
    const dayType: DayType = override ?? classifyDay(date)
    const worked = workedHoursPerDay[day - 1]
    const entryTotal = entryTotalsPerDay[day - 1]
    const isEntriesBalanced = worked > 0 && Math.abs(worked - entryTotal) < 0.01
    dayStatusMap[iso] = getDayStatus({
      dayType,
      hasWorkedHours: worked > 0,
      isEntriesBalanced,
      isoDate: iso,
      today: todayIso,
      hasAnyTrackedHours,
    })
  }

  // Compute overtime carry-over for this month
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
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
        month={monthIdx}
        onSelectDate={onSelectDate}
        onMonthChange={onMonthChange}
        dayStatusMap={dayStatusMap}
      />
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Tracked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Incomplete</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" /> Needs attention</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100 border border-blue-300" /> Today</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-300" /> Non-working</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white border border-gray-300" /> Future</span>
      </div>
    </div>
  )
}
