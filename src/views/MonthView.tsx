import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { MonthStatsPanel } from '../components/MonthStatsPanel'
import { workWindowRepo, timeEntryRepo, configRepo, dayTypeOverrideRepo } from '../repositories/shared'
import { calculateOvertimeCarryOver } from '../domain/overtimeCarryOver'
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
  const todayIso = toLocalIso(today)

  const { days, workDayCount, workedHoursPerDay } = buildMonthSummaries(year, month, {
    windows,
    entries,
    dayTypeOverrides,
    today: todayIso,
  })

  const dates = days.map((d) => d.date)

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

  return (
    <div className="flex flex-col gap-6">
      <MonthStatsPanel
        workedHoursPerDay={workedHoursPerDay}
        dates={dates}
        workDayCount={workDayCount}
        sollstunden={sollstunden}
        overtimeCarryOver={overtimeCarryOver}
        today={todayIso}
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
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-100 border border-red-300" /> Untracked</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-100 border border-blue-300" style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(59,130,246,0.2) 4px, rgba(59,130,246,0.2) 8px)' }} /> Today</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-purple-100 border border-purple-300" /> Leave</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-gray-100 border border-gray-300" /> Non-working</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-white border border-gray-300" /> Future</span>
      </div>
    </div>
  )
}
