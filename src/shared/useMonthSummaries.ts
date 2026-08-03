import { useQuery } from '@tanstack/react-query'
import { useRepositories } from '../infra/repositories/RepositoryContext'
import { composeMonthOvertime } from './monthOvertime'
import { useTodayIso } from './useTodayIso'
import { useAppConfig } from './useAppConfig'
import { QUERY_KEYS } from './queryKeys'
import { findOpenPeriod, findPlannedStopPeriod, nowHHMM } from './worktime'
import { targetHoursForDate } from './weekdayHours'
import type { DayTypeOverride, MonthData, WorkLocation } from '../infra/repositories/types'

interface MonthMaps {
  dayTypeOverrides: Map<string, DayTypeOverride>
  workLocations: Map<string, WorkLocation>
  confirmedDays: Set<string>
  dayNotes: Map<string, string>
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
  const { monthRepo } = useRepositories()
  const todayIso = useTodayIso()

  const config = useAppConfig()

  const { data: monthData = {} } = useQuery({
    queryKey: QUERY_KEYS.month(year, month),
    queryFn: () => monthRepo.getMonth(year, month),
  })

  const weekdayHours = config.weekdayHours
  const sollstunden = targetHoursForDate(new Date(), weekdayHours)

  const todayNow = nowHHMM()
  const { summaries, targetHoursPerDay, overtimeToDate } = composeMonthOvertime(
    year,
    month,
    monthData,
    config,
    todayIso,
    todayNow,
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
