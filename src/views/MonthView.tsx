import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthStatsPanel } from '../components/MonthStatsPanel'
import { OvertimeBar } from '../components/OvertimeBar'
import { workPeriodRepo, timeEntryRepo, configRepo, dayTypeOverrideRepo, dayConfirmationRepo, workLocationRepo } from '../repositories/shared'
import { calculateOvertimeCarryOver } from '../domain/overtimeCarryOver'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import type { DayStatus } from '../domain/dayStatus'
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
    queryFn: () => workPeriodRepo.findByDateRange(from, to),
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

  const { data: confirmedDays = new Set<string>() } = useQuery({
    queryKey: ['dayConfirmations', year, month],
    queryFn: () => dayConfirmationRepo.findConfirmedInRange(fromIso, toIso),
  })

  const { data: workLocations = new Map() } = useQuery({
    queryKey: ['workLocations', year, month],
    queryFn: () => workLocationRepo.findByDateRange(fromIso, toIso),
  })

  const sollstunden = config?.sollstunden ?? 8
  const todayIso = toLocalIso(today)

  const { days, workDayCount, workedHoursPerDay } = buildMonthSummaries(year, month, {
    windows,
    entries,
    dayTypeOverrides,
    today: todayIso,
    confirmedDays,
  })

  const dates = days.map((d) => d.date)
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, dates, todayIso, sollstunden)

  const dayStatusMap: Record<string, DayStatus> = {}
  for (const day of days) {
    dayStatusMap[day.date] = day.dayStatus
  }

  // Compute overtime carry-over for this month
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const overtimeCarryOver = calculateOvertimeCarryOver({
    initialOvertime: 0,
    monthlyOvertimes: [],
    manualOverrides: new Map(),
    targetMonth: monthKey,
  }).value

  // Office percentage
  const trackedWorkDays = days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <MonthCalendar
        year={year}
        month={monthIdx}
        onSelectDate={onSelectDate}
        onMonthChange={onMonthChange}
        dayStatusMap={dayStatusMap}
      />
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-emerald-300" /> Complete</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-100 border border-amber-300" /> Incomplete</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100 border border-blue-300" /> Untracked</span>
        <span className="flex items-center gap-1"><span className="relative inline-block h-3 w-3 rounded bg-white border border-gray-300"><span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-blue-500" /></span> Today</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-purple-100 border border-purple-300" /> Leave</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-300" /> Non-working</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white border border-gray-300" /> Future</span>
      </div>
      <OvertimeBar sollstunden={sollstunden} overtimeToDate={overtimeToDate.value} hoursNeededToday={overtimeToDate.hoursNeededToday} />
      <div className="flex items-center">
        <span className="text-xs text-gray-500">🏢 Office: {officePercent}% ({officeDays}/{trackedWorkDays.length} days)</span>
      </div>
      <MonthStatsPanel
        workedHoursPerDay={workedHoursPerDay}
        dates={dates}
        sollstunden={sollstunden}
        overtimeCarryOver={overtimeCarryOver}
        today={todayIso}
      />
    </div>
  )
}
