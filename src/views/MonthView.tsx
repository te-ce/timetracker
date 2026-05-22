import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { MonthCalendar } from '../components/MonthCalendar'
import { OvertimeBar } from '../components/OvertimeBar'
import {
  workPeriodRepo,
  timeEntryRepo,
  configRepo,
  dayTypeOverrideRepo,
  dayConfirmationRepo,
  workLocationRepo,
} from '../repositories/shared'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { buildMonthSummaries } from '../domain/daySummary'
import type { DayStatus } from '../domain/dayStatus'
import { getStatusReason, getWorkStatus } from '../domain/dayStatus'
import type { DayTypeOverride, WorkLocation } from '../repositories/types'
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

  const { data: dayTypeOverrides = new Map<string, DayTypeOverride>() } = useQuery({
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

  const { data: workLocations = new Map<string, WorkLocation>() } = useQuery({
    queryKey: ['workLocations', year, month],
    queryFn: () => workLocationRepo.findByDateRange(fromIso, toIso),
  })

  const sollstunden = config?.sollstunden ?? 8
  const todayIso = toLocalIso(today)

  const { days, workedHoursPerDay } = buildMonthSummaries(year, month, {
    windows,
    entries,
    dayTypeOverrides,
    today: todayIso,
    confirmedDays,
  })

  const dates = days.map((d) => d.date)
  const overtimeToDate = calculateOvertimeToDate(workedHoursPerDay, dates, todayIso, sollstunden)

  const dayStatusMap: Record<string, DayStatus> = {}
  const dayStatusReasonMap: Record<string, string> = {}
  for (const day of days) {
    dayStatusMap[day.date] = day.date === todayIso
      ? getWorkStatus({
          dayType: day.dayType,
          hasWorkedHours: day.workedHours > 0,
          hasManualEntries: day.entryTotal > 0,
          isEntriesBalanced: day.isEntriesBalanced,
          isConfirmed: confirmedDays.has(day.date),
        })
      : day.dayStatus
    dayStatusReasonMap[day.date] = getStatusReason({
      dayType: day.dayType,
      workedHours: day.workedHours,
      manualTotal: day.entryTotal,
      hasAutoCategory: day.hasAutoCategory,
      isConfirmed: confirmedDays.has(day.date),
      isoDate: day.date,
      today: todayIso,
    })
  }

  // Compute overtime carry-over for this month
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
        dayStatusReasonMap={dayStatusReasonMap}
      />
      <OvertimeBar
        sollstunden={sollstunden}
        priorOvertime={overtimeToDate.priorOvertime}
        workedToday={overtimeToDate.workedToday}
        officeDays={officeDays}
        totalWorkDays={trackedWorkDays.length}
        officePercent={officePercent}
      />
    </div>
  )
}
