import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { buildMonthSummaries, calculateOvertimeToDate } from '../features/month'
import { useTodayIso } from './useTodayIso'
import { DEFAULT_APP_CONFIG } from './appConfigDefaults'
import { QUERY_KEYS } from './queryKeys'
import { findOpenPeriod, findPlannedStopPeriod } from './worktime'
import { targetHoursForDate } from './weekdayHours'
import type { DayTypeOverride, MonthData, WorkLocation } from '../infra/repositories/types'

interface MonthMaps {
  dayTypeOverrides: Map<string, DayTypeOverride>
  workLocations: Map<string, WorkLocation>
  confirmedDays: Set<string>
  dayNotes: Map<string, string>
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function findTodayLiveWindowStart(
  monthData: MonthData,
  todayIso: string,
  year: number,
  month: number,
): string | undefined {
  const todayYear = parseInt(todayIso.slice(0, 4))
  const todayMonth = parseInt(todayIso.slice(5, 7))
  if (year !== todayYear || month !== todayMonth) return undefined
  return findOpenPeriod(monthData[todayIso]?.windows ?? [])?.start
}

function findTodayPlannedStopTime(
  monthData: MonthData,
  todayIso: string,
  year: number,
  month: number,
): string | undefined {
  const todayYear = parseInt(todayIso.slice(0, 4))
  const todayMonth = parseInt(todayIso.slice(5, 7))
  if (year !== todayYear || month !== todayMonth) return undefined
  return findPlannedStopPeriod(monthData[todayIso]?.windows ?? [], nowHHMM())?.end ?? undefined
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

export function useMonthSummaries(year: number, month: number) {
  const { monthRepo, configRepo } = useRepositories()
  const todayIso = useTodayIso()

  const { data: config } = useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: () => configRepo.get(),
  })

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  const weekdayHours = config?.weekdayHours ?? DEFAULT_APP_CONFIG.weekdayHours
  const sollstunden = targetHoursForDate(new Date(), weekdayHours)

  const d = new Date()
  const todayNow = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const summaries = buildMonthSummaries(year, month, {
    monthData,
    today: todayIso,
    globalAutoCategory: config?.autoCategory ?? null,
    todayNow,
  })

  const targetHoursPerDay = summaries.days.map((d) => targetHoursForDate(d.date, weekdayHours))

  const overtimeToDate = calculateOvertimeToDate(
    summaries.workedHoursPerDay,
    summaries.days.map((d) => d.date),
    todayIso,
    targetHoursPerDay,
    summaries.projectedWorkedHoursToday,
  )

  const { dayTypeOverrides, workLocations, confirmedDays, dayNotes } = extractMonthMaps(monthData)
  const todayLiveWindowStart = findTodayLiveWindowStart(monthData, todayIso, year, month)
  const todayPlannedStopTime = findTodayPlannedStopTime(monthData, todayIso, year, month)

  return {
    config,
    summaries,
    dayTypeOverrides,
    workLocations,
    confirmedDays,
    dayNotes,
    overtimeToDate,
    sollstunden,
    targetHoursPerDay,
    todayIso,
    todayLiveWindowStart,
    todayPlannedStopTime,
  }
}
