import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../repositories/RepositoryContext'
import { buildMonthSummaries } from '../domain/daySummary'
import { calculateOvertimeToDate } from '../domain/monthStats'
import { toLocalIso } from '../domain/dateUtils'
import { QUERY_KEYS } from './queryKeys'
import type { DayTypeOverride, MonthData, WorkLocation } from '../repositories/types'

interface MonthMaps {
  dayTypeOverrides: Map<string, DayTypeOverride>
  workLocations: Map<string, WorkLocation>
  confirmedDays: Set<string>
  dayNotes: Map<string, string>
}

function extractMonthMaps(monthData: MonthData): MonthMaps {
  const dayTypeOverrides = new Map<string, DayTypeOverride>()
  const workLocations = new Map<string, WorkLocation>()
  const confirmedDays = new Set<string>()
  const dayNotes = new Map<string, string>()
  for (const [date, day] of Object.entries(monthData)) {
    if (day.dayTypeOverride) dayTypeOverrides.set(date, day.dayTypeOverride)
    if (day.location) workLocations.set(date, day.location)
    if (day.confirmed) confirmedDays.add(date)
    if (day.note) dayNotes.set(date, day.note)
  }
  return { dayTypeOverrides, workLocations, confirmedDays, dayNotes }
}

export function useMonthQuery(year: number, month: number) {
  const { monthRepo, configRepo } = useRepositories()
  const todayIso = toLocalIso(new Date())

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  const sollstunden = config?.sollstunden ?? 8

  const summaries = buildMonthSummaries(year, month, {
    monthData,
    today: todayIso,
    globalAutoCategory: config?.autoCategory ?? null,
  })

  const overtimeToDate = calculateOvertimeToDate(
    summaries.workedHoursPerDay,
    summaries.days.map((d) => d.date),
    todayIso,
    sollstunden,
  )

  const { dayTypeOverrides, workLocations, confirmedDays, dayNotes } = extractMonthMaps(monthData)

  const trackedWorkDays = summaries.days.filter((d) => d.dayType === 'WorkDay' && d.workedHours > 0)
  const officeDays = trackedWorkDays.filter((d) => workLocations.get(d.date) === 'Office').length
  const officePercent = trackedWorkDays.length > 0 ? Math.round((officeDays / trackedWorkDays.length) * 100) : 0

  return {
    config,
    summaries,
    dayTypeOverrides,
    workLocations,
    confirmedDays,
    dayNotes,
    overtimeToDate,
    trackedWorkDays,
    officeDays,
    officePercent,
    sollstunden,
    todayIso,
  }
}
